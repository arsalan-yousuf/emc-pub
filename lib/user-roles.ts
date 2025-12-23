import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

// ============================================================================
// Type Definitions
// ============================================================================

export type UserRole = 'super_admin' | 'admin' | 'sales_support' | 'sales';

export const USER_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'sales_support', 'sales'] as const;

export interface RoleResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if a string is a valid UserRole
 */
function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

/**
 * Maps database role results to UserRole array
 */
function mapRolesToUserRoles(data: Array<{ role: string }> | null): UserRole[] {
  if (!data) return [];
  return data
    .map(item => item.role)
    .filter(isValidRole);
}

// ============================================================================
// Client-Side Role Functions
// ============================================================================

/**
 * Get the current user's roles with timeout protection
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Array of user roles, empty array if user not authenticated or error occurs
 */
export async function getUserRoles(timeoutMs: number = 10000): Promise<UserRole[]> {
  try {
    const supabase = createBrowserClient();
    
    // Create timeout promise
    const createTimeout = () => new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('getUserRoles: Request timed out'));
      }, timeoutMs);
    });

    // Race between getUser and timeout
    const getUserPromise = supabase.auth.getUser();
    let getUserResult;
    try {
      getUserResult = await Promise.race([
        getUserPromise,
        createTimeout(),
      ]);
    } catch (timeoutError) {
      if (timeoutError instanceof Error && timeoutError.message.includes('timed out')) {
        console.warn('getUserRoles: Auth check timed out after', timeoutMs, 'ms');
        return [];
      }
      throw timeoutError;
    }
    
    const { data: { user }, error: authError } = getUserResult;
    
    if (authError || !user) {
      return [];
    }

    // Race between role query and timeout
    const roleQueryPromise = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    let roleQueryResult;
    try {
      roleQueryResult = await Promise.race([
        roleQueryPromise,
        createTimeout(),
      ]);
    } catch (timeoutError) {
      if (timeoutError instanceof Error && timeoutError.message.includes('timed out')) {
        console.warn('getUserRoles: Role query timed out after', timeoutMs, 'ms');
        return [];
      }
      throw timeoutError;
    }

    const { data, error } = roleQueryResult;

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return mapRolesToUserRoles(data);
  } catch (error) {
    // Handle timeout or other errors
    if (error instanceof Error && error.message.includes('timed out')) {
      console.warn('getUserRoles: Request timed out after', timeoutMs, 'ms');
    } else {
      console.error('Error getting user roles:', error);
    }
    return [];
  }
}

/**
 * Check if the current user has a specific role
 * @param role - The role to check for
 * @returns True if user has the role, false otherwise
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

/**
 * Check if the current user is admin or super_admin
 * @returns True if user is admin or super_admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes('admin') || roles.includes('super_admin');
}

/**
 * Check if the current user is super_admin
 * @returns True if user is super_admin, false otherwise
 */
export async function isSuperAdmin(): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes('super_admin');
}

/**
 * Get a user's role (single role - first one found)
 * Works in both client and server contexts
 * @param userId - The user ID to get the role for
 * @param useServerClient - Whether to use server client (default: false)
 * @returns The user's role or null if not found or error occurs
 */
export async function getUserRole(userId: string, useServerClient: boolean = false): Promise<UserRole | null> {
  try {
    const supabase = useServerClient 
      ? await createServerClient()
      : createBrowserClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Try direct query first
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!error && data?.role && isValidRole(data.role)) {
      return data.role;
    }

    // If RLS blocks direct access, try RPC function as fallback
    if (error && (error.code === 'PGRST116' || error.message?.includes('406') || error.code === '42501')) {
      return await getUserRoleViaRPC(supabase, userId);
    }

    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Fallback method to get user role via RPC function
 * @param supabase - Supabase client instance
 * @param userId - The user ID to get the role for
 * @returns The user's role or null if not found
 */
async function getUserRoleViaRPC(
  supabase: Awaited<ReturnType<typeof createServerClient>> | ReturnType<typeof createBrowserClient>,
  userId: string
): Promise<UserRole | null> {
  for (const role of USER_ROLES) {
    try {
      const { data: hasRole, error: rpcError } = await supabase.rpc('user_has_role', {
        p_user: userId,
        p_role: role
      });
      
      if (!rpcError && hasRole === true) {
        return role;
      }
    } catch (rpcError) {
      // Continue to next role
      continue;
    }
  }
  return null;
}
