'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserRoles, type UserRole } from '@/lib/user-roles';
import { fetchCurrentProfile } from '@/lib/profiles-server';

/* ============================================================================
 * Types
 * ==========================================================================*/

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
  isLoading: boolean; // AUTH readiness only
  refreshUserData: () => Promise<void>;
}

/* ============================================================================
 * Context
 * ==========================================================================*/

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ============================================================================
 * Provider
 * ==========================================================================*/

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [user, setUser] = useState<UserContextType['user']>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Tracks only auth readiness (fast)
  const [isLoading, setIsLoading] = useState(true);

  // 🔒 Prevents auth noise (tab focus, token refresh)
  const lastUserIdRef = useRef<string | null>(null);

  /* ============================================================================
   * Helpers
   * ==========================================================================*/

  const formatUserName = useCallback(
    (
      profileData:
        | { first_name?: string | null; last_name?: string | null }
        | null
        | undefined,
      authUser: { email?: string | null; user_metadata?: any } | null
    ): string => {
      if (profileData?.first_name || profileData?.last_name) {
        return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
      }
      if (authUser?.user_metadata?.full_name) return authUser.user_metadata.full_name;
      if (authUser?.email) return authUser.email.split('@')[0];
      return 'Benutzer';
    },
    []
  );

  /* ============================================================================
   * Fetch profile + roles (non-blocking)
   * ==========================================================================*/

  const fetchUserDetails = useCallback(
    async (authUser: { id: string; email?: string | null }) => {
      try {
        const [profileResult, fetchedRoles] = await Promise.all([
          fetchCurrentProfile(),
          getUserRoles(),
        ]);

        const profileData = profileResult.success
          ? profileResult.profile
          : null;

        setProfile({
          email: authUser.email || undefined,
          name: formatUserName(profileData, authUser),
          first_name: profileData?.first_name || undefined,
          last_name: profileData?.last_name || undefined,
          dashboard_id: profileData?.metabase_dashboard_id || undefined,
        });

        setRoles(fetchedRoles);

        const isSuper = fetchedRoles.includes('super_admin');
        const isAdm = isSuper || fetchedRoles.includes('admin');

        setIsSuperAdmin(isSuper);
        setIsAdmin(isAdm);
        setRole(fetchedRoles[0] ?? null);
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      }
    },
    [formatUserName]
  );

  /* ============================================================================
   * Manual refresh
   * ==========================================================================*/

  const refreshUserData = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return;

    setUser(prev => (prev?.id === authUser.id ? prev : authUser));
    await fetchUserDetails(authUser);
  }, [fetchUserDetails, supabase]);

  /* ============================================================================
   * Auth bootstrap + listener
   * ==========================================================================*/

  useEffect(() => {
    let isActive = true;

    const initAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (authUser) {
        lastUserIdRef.current = authUser.id;
        setUser(authUser);
        setIsLoading(false); // auth ready immediately
        fetchUserDetails(authUser); // background
      } else {
        lastUserIdRef.current = null;
        setUser(null);
        setIsLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;

      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;

      // 🔒 Ignore auth noise (tab focus, token refresh)
      if (newUserId === lastUserIdRef.current) {
        return;
      }

      lastUserIdRef.current = newUserId;

      if (newUser) {
        setUser(newUser);
        fetchUserDetails(newUser);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setRoles([]);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [fetchUserDetails, supabase]);

  /* ============================================================================
   * Memoized context value (prevents mass re-renders)
   * ==========================================================================*/

  const value = useMemo<UserContextType>(
    () => ({
      user,
      profile,
      role,
      roles,
      isAdmin,
      isSuperAdmin,
      isLoading,
      refreshUserData,
    }),
    [user, profile, role, roles, isAdmin, isSuperAdmin, isLoading, refreshUserData]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/* ============================================================================
 * Hook
 * ==========================================================================*/

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
