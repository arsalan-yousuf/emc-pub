"use server";

import { createClient } from "@/lib/supabase/server";
import { type UserRole } from "./user-roles";

/**
 * Server action to get user role
 * This can be called from server components and client components
 */
export async function getUserRoleServer(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Fetch role directly from database (server-side, no RLS issues)
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    if (!roleData?.role) {
      return null;
    }

    return roleData.role as UserRole;
  } catch (error) {
    console.error('Error in getUserRoleServer:', error);
    return null;
  }
}

