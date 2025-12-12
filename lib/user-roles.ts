import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

export type UserRole = 'super_admin' | 'admin' | 'sales_support' | 'sales';

/**
 * Get the current user's roles
 */
export async function getUserRoles(): Promise<UserRole[]> {
  try {
    const supabase = createBrowserClient();
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

    return (data || []).map((item: { role: string }) => item.role as UserRole);
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
 * Works in both client and server contexts
 */
export async function getUserRole(userId: string, useServerClient: boolean = false): Promise<UserRole | null> {
  try {
    // Use server client if specified (for server actions) or try to detect
    const supabase = useServerClient 
      ? await createServerClient()
      : createBrowserClient();
    
    // First, get the current user to check if we're querying our own role
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // If querying own role, use direct query (allowed by RLS)
    // If querying another user's role, we need to be admin/super_admin (also allowed by RLS)
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting user role - details:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        userId,
        currentUserId: currentUser?.id,
        isQueryingOwnRole: currentUser?.id === userId
      });
      
      // If 406 error (RLS policy issue), try alternative approach using RPC
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.code === '42501') {
        console.warn('Direct user_roles access blocked by RLS, trying RPC function');
        
        // Try using user_has_role RPC for each role type
        const roles: UserRole[] = ['super_admin', 'admin', 'sales_support', 'sales'];
        for (const role of roles) {
          try {
            const { data: hasRole } = await supabase.rpc('user_has_role', {
              p_user: userId,
              p_role: role
            });
            if (hasRole === true) {
              return role;
            }
          } catch (rpcError) {
            // Continue to next role
            continue;
          }
        }
        return null;
      }
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
    const supabase = createBrowserClient();
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
    const supabase = createBrowserClient();
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

