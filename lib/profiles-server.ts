"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { type UserRole } from "./user-roles";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  metabase_dashboard_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentProfileResult {
  success: boolean;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    metabase_dashboard_id: number | null;
  };
  error?: string;
}

export async function updateUserProfile(
  profileId: string,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    metabase_dashboard_id: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Fetch caller role
    const { data: callerRoleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const callerRole = (callerRoleRow?.role as UserRole | undefined) || null;

    // Fetch target role
    const { data: targetRoleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profileId)
      .limit(1)
      .maybeSingle();
    const targetRole = (targetRoleRow?.role as UserRole | undefined) || null;

    // Authorization: super_admin can edit anyone; user can edit self; admin cannot edit admins/super_admins
    const isSelf = user.id === profileId;
    const callerIsSuperAdmin = callerRole === "super_admin";
    const callerIsAdmin = callerRole === "admin";
    if (
      !isSelf &&
      !callerIsSuperAdmin &&
      !(callerIsAdmin && targetRole !== "admin" && targetRole !== "super_admin")
    ) {
      return { success: false, error: "You do not have permission to edit this profile" };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        metabase_dashboard_id: data.metabase_dashboard_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" };
  }
}

export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user and ensure super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (roleError || roleRow?.role !== "super_admin") {
      return { success: false, error: "Only super_admin can delete users" };
    }

    if (user.id === userId) {
      return { success: false, error: "You cannot delete your own account" };
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return { success: false, error: "Service role key or URL not configured" };
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting user account:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete user" };
  }
}

export async function fetchCurrentProfile(): Promise<CurrentProfileResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, metabase_dashboard_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return {
      success: true,
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        metabase_dashboard_id: profile.metabase_dashboard_id,
      },
    };
  } catch (error) {
    console.error("Error fetching current profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

export interface ProfileWithRole extends Profile {
  role: UserRole | null;
}

export interface FetchProfilesResult {
  success: boolean;
  data?: ProfileWithRole[];
  error?: string;
  currentUserId?: string;
  isSuperAdmin?: boolean;
}

/**
 * Server action to fetch all profiles with their roles
 * Only accessible to admin and super_admin users
 */
export async function fetchProfiles(): Promise<FetchProfilesResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated' 
      };
    }

    // Check if user is admin or super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    if (roleError) {
      console.error('Error checking admin role:', roleError);
      return { 
        success: false, 
        error: 'Failed to verify permissions' 
      };
    }

    if (!roleData || roleData.length === 0) {
      return { 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      };
    }

    const isSuperAdmin = roleData.some(r => r.role === 'super_admin');

    // Fetch all profiles with roles using database function
    const { data: profilesData, error: profilesError } = await supabase
      .rpc('get_profiles_with_role');

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      return { 
        success: false, 
        error: profilesError.message || 'Failed to load profiles. Please check your permissions.' 
      };
    }

    if (!profilesData) {
      return { 
        success: true, 
        data: [], 
        currentUserId: user.id, 
        isSuperAdmin 
      };
    }

    // Map the database function results to ProfileWithRole format
    const profilesWithRoles: ProfileWithRole[] = profilesData.map((row: any) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      metabase_dashboard_id: row.metabase_dashboard_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: row.role ? (row.role as UserRole) : null
    }));

    return { 
      success: true, 
      data: profilesWithRoles, 
      currentUserId: user.id, 
      isSuperAdmin 
    };
  } catch (error) {
    console.error('Error in fetchProfiles:', error);
    return { 
      success: false, 
      error: error instanceof Error 
        ? error.message 
        : 'Failed to load profiles. Please check your permissions and ensure RLS policies are configured correctly.' 
    };
  }
}

