import { createClient } from '@/lib/supabase/client';

export type UserRole = 'super_admin' | 'admin' | 'sales_support' | 'sales';

/**
 * Get the current user's roles
 */
export async function getUserRoles(): Promise<UserRole[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return (data || []).map(item => item.role as UserRole);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

/**
 * Check if the current user is admin or super_admin
 */
export async function isAdmin(): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes('admin') || roles.includes('super_admin');
}

/**
 * Check if the current user is super_admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes('super_admin');
}

/**
 * Get a user's role (single role - first one found)
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      // If 406 error (RLS policy issue), try alternative approach
      if (error.code === 'PGRST116' || error.message?.includes('406')) {
        console.warn('Direct user_roles access blocked, user may not have role assigned');
        return null;
      }
      console.error('Error getting user role:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Grant a role to a user (calls the database function)
 */
export async function grantRoleToUser(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('grant_role', {
      p_target: userId,
      p_role: role
    });

    if (error) {
      // If the error is about duplicate key, the role already exists - that's okay
      if (error.message?.includes('duplicate key') || error.message?.includes('already exists') || error.code === '23505') {
        console.log(`Role ${role} already exists for user ${userId}, skipping`);
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error granting role:', error);
    // Handle duplicate key error in catch block too
    if (error instanceof Error && (error.message.includes('duplicate key') || error.message.includes('already exists'))) {
      return { success: true };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to grant role' };
  }
}

/**
 * Revoke a role from a user (calls the database function)
 */
export async function revokeRoleFromUser(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('revoke_role', {
      p_target: userId,
      p_role: role
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error revoking role:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to revoke role' };
  }
}

