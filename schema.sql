
-- 1. Create roles enum (optional)
DO $$ BEGIN
  CREATE TYPE app_user_role AS ENUM ('super_admin','admin','sales_support','sales');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_user_role NOT NULL,
  granted_by uuid NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and super_admins can view all user roles & users can view self roles
CREATE POLICY "user_roles_select_admins_owner" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can view roles
    OR public.is_user_in_role('admin')
    -- user can view it's own
    OR (user_id = auth.uid())
  );

CREATE POLICY "user_roles_insert_admins" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can insert roles
    OR (public.is_user_in_role('admin') AND (role = 'sales' OR role = 'sales_support'))
  );

CREATE POLICY "user_roles_update_admins" ON public.user_roles
  FOR UPDATE TO authenticated
  WITH CHECK (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can update roles
    OR (public.is_user_in_role('admin') AND (role = 'sales' OR role = 'sales_support'))
  );

CREATE POLICY "user_roles_delete_admins" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can delete roles
    OR (public.is_user_in_role('admin') AND (role = 'sales' OR role = 'sales_support'))
  );

-- 4. SECURITY DEFINER helper to check membership
CREATE OR REPLACE FUNCTION public.is_user_in_role(p_role app_user_role) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = p_role
  );
$$;

-- 5. Grant execute to supabase_auth_admin, revoke from public/authenticated/anon
GRANT EXECUTE ON FUNCTION public.is_user_in_role(app_user_role) TO supabase_auth_admin, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_user_in_role(app_user_role) FROM anon, public;

CREATE OR REPLACE FUNCTION public.user_has_role(p_user uuid, p_role app_user_role) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = p_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, app_user_role) TO supabase_auth_admin, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, app_user_role) FROM anon, public;

-- grant role function (only super_admin or admin can grant roles)
CREATE OR REPLACE FUNCTION public.grant_role(p_target uuid, p_role app_user_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_is_super boolean;
  caller_is_admin boolean;
BEGIN
  -- Check caller roles
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    INTO caller_is_super;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    INTO caller_is_admin;

  -- Authorization: super_admin or admin required
  IF NOT (caller_is_super OR caller_is_admin) THEN
    RAISE EXCEPTION 'not authorized to grant roles';
  END IF;

  -- If caller is admin, restrict which roles they can grant
  IF caller_is_admin AND NOT caller_is_super THEN
    IF p_role NOT IN ('sales', 'sales_support') THEN
      RAISE EXCEPTION 'admin may only grant sales or sales_support roles';
    END IF;
  END IF;

  -- Insert role if not exists
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_target AND role = p_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role, granted_by) VALUES (p_target, p_role, auth.uid());
  END IF;
END;
$$;

-- Revoke role
CREATE OR REPLACE FUNCTION public.revoke_role(p_target uuid, p_role app_user_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_is_super boolean;
  caller_is_admin boolean;
BEGIN
  -- Determine caller roles
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    INTO caller_is_super;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    INTO caller_is_admin;

  -- Authorization check
  IF NOT (caller_is_super OR caller_is_admin) THEN
    RAISE EXCEPTION 'not authorized to revoke roles';
  END IF;

  -- Prevent any caller from revoking 'super_admin' role
  IF p_role = 'super_admin' THEN
    RAISE EXCEPTION 'revoking super_admin role is not allowed';
  END IF;

  -- If caller is admin (and not super), restrict which roles they can revoke
  IF caller_is_admin AND NOT caller_is_super THEN
    IF p_role NOT IN ('sales', 'sales_support') THEN
      RAISE EXCEPTION 'admin may only revoke sales or sales_support roles';
    END IF;
  END IF;

  -- Perform revocation
  DELETE FROM public.user_roles
  WHERE user_id = p_target AND role = p_role;
END;
$$;

-- Who can execute these? We'll restrict to supabase_auth_admin and the service_role only via server.
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, app_user_role) TO supabase_auth_admin, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, app_user_role) TO supabase_auth_admin, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_role(uuid, app_user_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid, app_user_role) FROM anon, public;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  metabase_dashboard_id integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- trigger to update updated_at on change (optional)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'email'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy (view)
DROP POLICY IF EXISTS "profiles_select_super_admin_admin_sales_support" ON public.profiles;
CREATE POLICY "profiles_select_super_admin_admin_sales_support" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can view profiles of admin, sales & sales_support
    OR (
      public.is_user_in_role('admin')
      AND NOT public.user_has_role(id, 'super_admin')
    )
    -- sales_support & sales can view profiles of sales or sales_support
    OR (
      (
        public.is_user_in_role('sales_support') 
        OR public.is_user_in_role('sales')
      )
      AND (
        public.user_has_role(id, 'sales')
        OR public.user_has_role(id, 'sales_support')
      )
    )
    -- sales can view their own summaries
    OR ( id = auth.uid() )
  );

-- UPDATE policy (edit)
DROP POLICY IF EXISTS "profiles_update_admins_or_owner" ON public.profiles;

CREATE POLICY "profiles_update_admins_or_owner" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    -- allow if updating own profile
    id = auth.uid()
    -- OR allow if caller is super_admin (super_admin can update anyone)
    OR public.is_user_in_role('super_admin')
    -- OR allow if caller is admin AND the target user is sales or sales_support
    OR (
      public.is_user_in_role('admin')
      AND (
        public.user_has_role(id, 'sales')
        OR public.user_has_role(id, 'sales_support')
      )
    )
  )
  WITH CHECK (
    -- same checks on the new row to ensure edits don't bypass rules
    (id = auth.uid())
    OR public.is_user_in_role('super_admin')
    OR (
      public.is_user_in_role('admin')
      AND (
        public.user_has_role(id, 'sales')
        OR public.user_has_role(id, 'sales_support')
      )
    )
  );

-- INSERT policy (allow users to create their profile)
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (id IS NOT NULL) AND (id = auth.uid()) OR public.is_user_in_role('admin') OR public.is_user_in_role('super_admin')
  );

-- DELETE policy
CREATE POLICY "profiles_delete_admins" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    (public.is_user_in_role('super_admin') AND (public.user_has_role(id, 'sales') OR public.user_has_role(id, 'sales_support') OR public.user_has_role(id, 'admin')))
    OR (public.is_user_in_role('admin') AND (public.user_has_role(id, 'sales') OR public.user_has_role(id, 'sales_support')))
  );


CREATE TABLE sales_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  transcript TEXT NOT NULL,
  summary TEXT NOT NULL,
  language TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_summaries_user_id ON sales_summaries(user_id);
CREATE INDEX idx_sales_summaries_created_at ON sales_summaries(created_at DESC);

ALTER TABLE public.sales_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "sales_summaries_select_by_role_owner" ON public.sales_summaries
  FOR SELECT TO authenticated
  USING (
    -- super_admin or admin: full access
    public.is_user_in_role('super_admin')
    OR (
      public.is_user_in_role('admin')
      AND (
        public.user_has_role(user_id, 'admin')
        OR public.user_has_role(user_id, 'sales')
        OR public.user_has_role(user_id, 'sales_support')
      )
    )
    -- sales_support can view summaries whose owner is sales or sales_support
    OR (
      public.is_user_in_role('sales_support')
      OR public.is_user_in_role('sales')
      AND (
        public.user_has_role(user_id, 'sales')
        OR public.user_has_role(user_id, 'sales_support')
      )
    )
    -- sales can view their own summaries
    OR ( user_id = auth.uid() )
  );

-- INSERT policy (sales can insert own summary, admins/super_admin can insert for anyone if needed)
CREATE POLICY "sales_summaries_insert_owner_or_admin" ON public.sales_summaries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_in_role('super_admin')
    OR public.is_user_in_role('admin')
    OR ( user_id = auth.uid() )
  );

-- UPDATE policy (owner, admin, super_admin can update)
CREATE POLICY "sales_summaries_update_owner_or_admin" ON public.sales_summaries
  FOR UPDATE TO authenticated
  USING (
    public.is_user_in_role('super_admin')
    OR (public.is_user_in_role('admin') AND (public.user_has_role(user_id, 'sales') OR public.user_has_role(user_id, 'sales_support')))
    OR ( user_id = auth.uid() )
  )
  WITH CHECK (
    public.is_user_in_role('super_admin')
    OR (public.is_user_in_role('admin') AND (public.user_has_role(user_id, 'sales') OR public.user_has_role(user_id, 'sales_support')))
    OR ( user_id = auth.uid() )
  );

-- DELETE policy (owner, admin, super_admin can delete)
CREATE POLICY "sales_summaries_delete_admins" ON public.sales_summaries
  FOR DELETE TO authenticated
  USING (
    public.is_user_in_role('super_admin')
    OR (public.is_user_in_role('admin') AND (public.user_has_role(user_id, 'sales') OR public.user_has_role(user_id, 'sales_support')))
    OR ( user_id = auth.uid() )
  );

