'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserRoles, getUserRole, type UserRole } from '@/lib/user-roles';
import { fetchCurrentProfile } from '@/lib/profiles-server';

// ============================================================================
// Type Definitions
// ============================================================================

interface UserProfile {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  dashboard_id?: number;
}

interface UserContextType {
  user: { id: string; email?: string | null } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  roles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const UserContext = createContext<UserContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Formats user's full name from profile or metadata
   */
  const formatUserName = useCallback((
    profileData: { first_name?: string | null; last_name?: string | null } | null | undefined,
    authUser: { email?: string | null; user_metadata?: Record<string, any> } | null
  ): string => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    if (profileData?.first_name || profileData?.last_name) {
      return profileData.first_name || profileData.last_name || '';
    }
    if (authUser?.user_metadata?.full_name) {
      return authUser.user_metadata.full_name;
    }
    if (authUser?.user_metadata?.name) {
      return authUser.user_metadata.name;
    }
    if (authUser?.email) {
      return authUser.email.split('@')[0];
    }
    return 'Benutzer';
  }, []);

  /**
   * Fetches and updates all user data (profile, roles, admin status)
   */
  const refreshUserData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setRoles([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      setUser(authUser);

      // Fetch profile and roles in parallel
      const [profileResult, userRoles] = await Promise.all([
        fetchCurrentProfile(),
        getUserRoles(10000), // Use longer timeout for initial fetch
      ]);

      const profileData = profileResult.success ? profileResult.profile : null;
      const fullName = formatUserName(profileData, authUser);

      // Set profile
      setProfile({
        email: authUser.email || undefined,
        name: fullName,
        first_name: profileData?.first_name || undefined,
        last_name: profileData?.last_name || undefined,
        dashboard_id: profileData?.metabase_dashboard_id || undefined,
      });

      // Set roles
      setRoles(userRoles);
      const isSuperAdminValue = userRoles.includes('super_admin');
      const isAdminValue = isSuperAdminValue || userRoles.includes('admin');
      setIsSuperAdmin(isSuperAdminValue);
      setIsAdmin(isAdminValue);

      // Get primary role (first role found, or fetch via getUserRole as fallback)
      const primaryRole = userRoles.length > 0 ? userRoles[0] : await getUserRole(authUser.id);
      setRole(primaryRole);

      setIsLoading(false);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setIsLoading(false);
      // Don't clear user data on error, just log it
    }
  }, [formatUserName]);

  // Initial fetch and auth state listener
  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      const supabase = createClient();
      
      // Get initial user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!isMounted) return;

      if (authUser) {
        await refreshUserData();
      } else {
        setIsLoading(false);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          // User logged in - fetch role immediately
          await refreshUserData();
        } else {
          // User logged out
          setUser(null);
          setProfile(null);
          setRole(null);
          setRoles([]);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, [refreshUserData]);

  const value: UserContextType = {
    user,
    profile,
    role,
    roles,
    isAdmin,
    isSuperAdmin,
    isLoading,
    refreshUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

