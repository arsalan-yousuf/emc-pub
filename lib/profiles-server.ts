"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { type UserRole } from "./user-roles";

// ============================================================================
// Type Definitions
// ============================================================================

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  metabase_dashboard_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRole extends Profile {
  role: UserRole | null;
}

export interface UpdateProfileData {
  first_name: string;
  last_name: string;
  email: string;
  metabase_dashboard_id: number | null;
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

export interface FetchProfilesResult {
  success: boolean;
  data?: ProfileWithRole[];
  error?: string;
  currentUserId?: string;
  isSuperAdmin?: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface RoleResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Authenticates the current user and returns the user object
 * @throws Error if user is not authenticated
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Not authenticated");
  }
  
  return { supabase, user };
}

/**
 * Fetches the role of a user
 * @param supabase - Supabase client instance (awaited from createClient)
 * @param userId - User ID to check
 * @returns The user's role or null if no role exists
 */
async function getUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserRole | null> {
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  
  return (roleRow?.role as UserRole | undefined) || null;
}

/**
 * Checks if a user has permission to edit a profile
 * @param callerRole - Role of the user attempting to edit
 * @param targetRole - Role of the profile being edited
 * @param isSelf - Whether the caller is editing their own profile
 * @returns True if the user has permission to edit
 */
function canEditProfile(
  callerRole: UserRole | null,
  targetRole: UserRole | null,
  isSelf: boolean
): boolean {
  if (isSelf) return true;
  if (callerRole === "super_admin") return true;
  if (callerRole === "admin" && targetRole !== "admin" && targetRole !== "super_admin") {
    return true;
  }
  return false;
}

/**
 * Creates an admin Supabase client using service role key
 * @throws Error if service role key or URL is not configured
 */
function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceKey || !supabaseUrl) {
    throw new Error("Service role key or URL not configured");
  }
  
  return createSupabaseAdminClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if an error is a duplicate key error (used for role mutations)
 */
function isDuplicateKeyError(error: { message?: string; code?: string } | Error): boolean {
  const message = error instanceof Error ? error.message : error.message || "";
  const code = "code" in error ? (error as any).code : undefined;
  return (
    message.includes("duplicate key") ||
    message.includes("already exists") ||
    code === "23505"
  );
}

/**
 * Updates a user profile
 * @param profileId - ID of the profile to update
 * @param data - Profile data to update
 * @returns Success status and error message if any
 */
export async function updateUserProfile(
  profileId: string,
  data: UpdateProfileData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Check permissions
    const callerRole = await getUserRole(supabase, user.id);
    const targetRole = await getUserRole(supabase, profileId);
    const isSelf = user.id === profileId;

    if (!canEditProfile(callerRole, targetRole, isSelf)) {
      return { 
        success: false, 
        error: "You do not have permission to edit this profile" 
      };
    }

    // Update profile
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
      console.error("Error updating profile:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to update profile";
    return { success: false, error: errorMessage };
  }
}

/**
 * Deletes a user account (only super_admin can delete users)
 * @param userId - ID of the user account to delete
 * @returns Success status and error message if any
 */
export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Check if user is super_admin
    const role = await getUserRole(supabase, user.id);
    if (role !== "super_admin") {
      return { success: false, error: "Only super_admin can delete users" };
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return { success: false, error: "You cannot delete your own account" };
    }

    // Use admin client to delete user
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting user account:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to delete user";
    return { success: false, error: errorMessage };
  }
}

/**
 * Grant a role to a user (server-side, calls the database function)
 * Uses the authenticated Supabase server client (cookie-based auth).
 */
export async function grantRoleToUser(userId: string, role: UserRole): Promise<RoleResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("grant_role", {
      p_target: userId,
      p_role: role,
    });

    if (error) {
      // If the error is about duplicate key, the role already exists - that's okay
      if (isDuplicateKeyError(error)) {
        return { success: true };
      }
      console.error("Error granting role:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error granting role:", error);
    if (error instanceof Error && isDuplicateKeyError(error)) {
      return { success: true };
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to grant role";
    return { success: false, error: errorMessage };
  }
}

/**
 * Revoke a role from a user (server-side, calls the database function)
 */
export async function revokeRoleFromUser(userId: string, role: UserRole): Promise<RoleResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("revoke_role", {
      p_target: userId,
      p_role: role,
    });

    if (error) {
      console.error("Error revoking role:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error revoking role:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to revoke role";
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetches the current authenticated user's profile
 * @returns The user's profile or error message
 */
export async function fetchCurrentProfile(): Promise<CurrentProfileResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, metabase_dashboard_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: profileError.message };
    }

    if (!profile) {
      return { success: false, error: "Profile not found" };
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
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to fetch profile";
    return { success: false, error: errorMessage };
  }
}

/**
 * Server action to fetch all profiles with their roles
 * Only accessible to admin and super_admin users
 * @returns All profiles with roles, current user ID, and super admin status
 */
export async function fetchProfiles(): Promise<FetchProfilesResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

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

    // Handle empty result
    if (!profilesData || profilesData.length === 0) {
      return { 
        success: true, 
        data: [], 
        currentUserId: user.id, 
        isSuperAdmin 
      };
    }

    // Map the database function results to ProfileWithRole format
    const profilesWithRoles: ProfileWithRole[] = profilesData.map((row: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      metabase_dashboard_id: number | null;
      created_at: string;
      updated_at: string;
      role: string | null;
    }) => ({
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
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to load profiles. Please check your permissions and ensure RLS policies are configured correctly.';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

