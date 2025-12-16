"use server";

import { createClient } from "@/lib/supabase/server";
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

    console.log('profilesData', profilesData);
    console.log('profilesError', profilesError);
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

