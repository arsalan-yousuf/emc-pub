-- RLS Policies for user_roles table
-- Run this in your Supabase SQL editor to enable access to user_roles table

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and super_admins can view all user roles
CREATE POLICY "user_roles_select_admins" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    -- super_admin: full access
    public.is_user_in_role('super_admin')
    -- admin can view roles
    OR public.is_user_in_role('admin')
  );

-- Policy: Users can view their own roles
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Note: INSERT, UPDATE, DELETE are handled by the grant_role and revoke_role functions
-- which are SECURITY DEFINER and have their own authorization checks

