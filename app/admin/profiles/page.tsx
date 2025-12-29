'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { type UserRole } from '@/lib/user-roles';
import {
  fetchProfiles,
  type ProfileWithRole,
  deleteUserAccount,
  updateUserProfile,
  type UpdateProfileData,
  grantRoleToUser,
  revokeRoleFromUser,
} from '@/lib/profiles-server';
import { useRouter } from 'next/navigation';
import { Edit2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, CheckCircle2, } from 'lucide-react';
import EditProfileModal from '@/components/admin/EditProfileModal';
import DeleteConfirmationModal from '@/components/summaries/DeleteConfirmationModal';
import { useUser } from '@/contexts/UserContext';

// ============================================================================
// Type Definitions
// ============================================================================

type SortField = 'first_name' | 'last_name' | 'email' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface ProfileUpdateData extends UpdateProfileData {
  role: UserRole | null;
}

interface AppState {
  profiles: ProfileWithRole[];
  filteredProfiles: ProfileWithRole[];
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  currentPage: number;
}

interface UserState {
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  userId: string | null;
}

interface ModalState {
  editingProfile: ProfileWithRole | null;
  deletingUserId: string | null;
  isDeleteModalOpen: boolean;
  userToDelete: ProfileWithRole | null;
}

const ITEMS_PER_PAGE = 10;
const ERROR_DISPLAY_DURATION = 5000;
const SUCCESS_DISPLAY_DURATION = 3000;

export default function AdminProfilesPage() {
  const router = useRouter();
  const isLoadingRef = useRef(false);
  const hasLoadedProfilesRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const { isAdmin: userIsAdmin, isSuperAdmin: userIsSuperAdmin, isLoading: userContextLoading, user } = useUser();

  // State management
  const [appState, setAppState] = useState<AppState>({
    profiles: [],
    filteredProfiles: [],
    searchQuery: '',
    sortField: 'created_at',
    sortDirection: 'desc',
    currentPage: 1,
  });

  const [userState, setUserState] = useState<UserState>({
    isAuthorized: false,
    isSuperAdmin: false,
    userId: null,
  });

  const [modalState, setModalState] = useState<ModalState>({
    editingProfile: null,
    deletingUserId: null,
    isDeleteModalOpen: false,
    userToDelete: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const showError = useCallback((message: string, duration: number = ERROR_DISPLAY_DURATION) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  }, []);

  const showSuccess = useCallback((message: string, duration: number = SUCCESS_DISPLAY_DURATION) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), duration);
  }, []);

  const canEditProfile = useCallback((profile: ProfileWithRole): boolean => {
    if (userState.isSuperAdmin) return true;
    if (userState.userId && profile.id === userState.userId) return true;
    if (profile.role === 'admin' || profile.role === 'super_admin') return false;
    return true;
  }, [userState.isSuperAdmin, userState.userId]);

  const handleRoleChange = useCallback(async (
    profileId: string,
    currentRole: UserRole | null,
    newRole: UserRole | null
  ): Promise<void> => {
    if (currentRole === newRole) return;
    // Case 1: Assigning "Staff Member" - only revoke existing role
    if (!newRole && currentRole) {
      const revokeResult = await revokeRoleFromUser(profileId, currentRole);
      if (!revokeResult.success) {
        const errorMsg = revokeResult.error || '';
        if (!errorMsg.includes('not found') && !errorMsg.includes('does not exist')) {
          throw new Error(errorMsg || 'Rolle konnte nicht entzogen werden');
        }
      }
      return;
    }

    // Case 2: Assigning role from "Staff Member" - only grant new role
    if (newRole && !currentRole) {
      const grantResult = await grantRoleToUser(profileId, newRole);
      if (!grantResult.success) {
        throw new Error(grantResult.error || 'Rolle konnte nicht zugewiesen werden');
      }
      return;
    }

    // Case 3: Changing from one role to another - revoke old and grant new
    if (currentRole && newRole) {
      const revokeResult = await revokeRoleFromUser(profileId, currentRole);
      if (!revokeResult.success) {
        const errorMsg = revokeResult.error || '';
        if (!errorMsg.includes('not found') && !errorMsg.includes('does not exist')) {
          throw new Error(errorMsg || 'Rolle konnte nicht entzogen werden');
        }
      }
      const grantResult = await grantRoleToUser(profileId, newRole);
      if (!grantResult.success) {
        throw new Error(grantResult.error || 'Rolle konnte nicht zugewiesen werden');
      }
    }
  }, []);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadProfiles = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetchProfiles();

      if (!result.success) {
        throw new Error(result.error || 'Profile konnten nicht geladen werden');
      }

      const profilesData = result.data || [];
      
      setAppState(prev => ({ ...prev, profiles: profilesData }));
      setUserState(prev => ({
        ...prev,
        userId: result.currentUserId || null,
        isSuperAdmin: result.isSuperAdmin || false,
      }));
    } catch (err) {
      console.error('Error loading profiles:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : 'Profile konnten nicht geladen werden. Bitte überprüfen Sie Ihre Berechtigungen und stellen Sie sicher, dass RLS-Richtlinien korrekt konfiguriert sind.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // Check authorization and load profiles on mount
  useEffect(() => {
    let isMounted = true;

    const checkAuthAndLoad = async () => {
      // Wait for user context to finish loading
      if (userContextLoading) {
        setIsLoading(true);
        return;
      }

      try {
        // Check authorization using context values (no API calls needed)
        if (!userIsAdmin) {
          if (!isMounted) return;
          router.push('/dashboard');
          return;
        }

        if (!isMounted) return;

        const currentUserId = user?.id || null;
        const userIdChanged = lastLoadedUserIdRef.current !== currentUserId;
        
        // Only set loading state if we haven't loaded profiles yet or user changed
        if (!hasLoadedProfilesRef.current || userIdChanged) {
          setIsLoading(true);
        }
        setError(null);

        setUserState(prev => ({ 
          ...prev, 
          isAuthorized: true,
          isSuperAdmin: userIsSuperAdmin,
          userId: currentUserId
        }));
        
        // Only load profiles if we haven't loaded them yet or user changed
        if (!hasLoadedProfilesRef.current || userIdChanged) {
          await loadProfiles();
          hasLoadedProfilesRef.current = true;
          lastLoadedUserIdRef.current = currentUserId;
        }
      } catch (err) {
        if (!isMounted) return;

        console.error('Error in authorization check:', err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Fehler bei der Autorisierung. Bitte die Seite aktualisieren.';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    checkAuthAndLoad();

    return () => {
      isMounted = false;
    };
    // Only depend on values that should trigger a re-check of authorization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userContextLoading, userIsAdmin, user?.id, router]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    if (!userState.isAuthorized || isLoading || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await loadProfiles();
      // Update refs after successful refresh
      hasLoadedProfilesRef.current = true;
      lastLoadedUserIdRef.current = user?.id || null;
      showSuccess('Profile erfolgreich aktualisiert');
    } catch (err) {
      console.error('Error refreshing profiles:', err);
      showError('Fehler beim Aktualisieren der Profile');
    } finally {
      setIsRefreshing(false);
    }
  }, [userState.isAuthorized, isLoading, isRefreshing, loadProfiles, showSuccess, showError, user?.id]);

  // Filter and sort profiles
  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = [...appState.profiles];

    // Apply search filter
    if (appState.searchQuery.trim()) {
      const query = appState.searchQuery.toLowerCase();
      filtered = filtered.filter(profile => {
        const firstName = profile.first_name?.toLowerCase() || '';
        const lastName = profile.last_name?.toLowerCase() || '';
        const email = profile.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.includes(query) || email.includes(query);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (appState.sortField) {
        case 'first_name':
          aValue = a.first_name || '';
          bValue = b.first_name || '';
          break;
        case 'last_name':
          aValue = a.last_name || '';
          bValue = b.last_name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return appState.sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [appState.profiles, appState.searchQuery, appState.sortField, appState.sortDirection]);

  // Reset to first page when filter changes
  useEffect(() => {
    setAppState(prev => ({ ...prev, currentPage: 1 }));
  }, [appState.searchQuery, appState.sortField, appState.sortDirection]);

  // Pagination
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(filteredAndSortedProfiles.length / ITEMS_PER_PAGE);
    const startIndex = (appState.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProfiles = filteredAndSortedProfiles.slice(startIndex, endIndex);

    return { totalPages, startIndex, endIndex, paginatedProfiles };
  }, [filteredAndSortedProfiles, appState.currentPage]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSort = useCallback((field: SortField) => {
    setAppState(prev => {
      if (prev.sortField === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        ...prev,
        sortField: field,
        sortDirection: 'asc',
      };
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setAppState(prev => ({ ...prev, searchQuery: value }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setAppState(prev => ({ ...prev, currentPage: newPage }));
  }, []);

  const handleEdit = useCallback((profile: ProfileWithRole) => {
    if (!canEditProfile(profile)) {
      showError('Sie haben keine Berechtigung, dieses Profil zu bearbeiten. Nur Super-Administratoren können Admin- und Super-Admin-Profile bearbeiten.');
      return;
    }
    setModalState(prev => ({ ...prev, editingProfile: profile }));
  }, [canEditProfile, showError]);

  const handleDeleteUser = useCallback(async () => {
    const profile = modalState.userToDelete;
    if (!profile) return;

    if (!userState.isSuperAdmin) {
      showError('Nur Super-Administratoren können Benutzerkonten löschen.');
      return;
    }

    if (userState.userId && profile.id === userState.userId) {
      showError('Sie können Ihr eigenes Konto nicht löschen.');
      return;
    }

    setModalState(prev => ({ ...prev, deletingUserId: profile.id }));
    setError(null);
    setSuccess(null);
    
    try {
      const result = await deleteUserAccount(profile.id);
      if (!result.success) {
        throw new Error(result.error || 'Benutzer konnte nicht gelöscht werden');
      }
      showSuccess('Benutzer erfolgreich gelöscht');
      await loadProfiles();
      // Update refs after successful deletion
      hasLoadedProfilesRef.current = true;
      lastLoadedUserIdRef.current = user?.id || null;
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Benutzer konnte nicht gelöscht werden';
      setError(errorMessage);
    } finally {
      setModalState(prev => ({ ...prev, deletingUserId: null }));
    }
  }, [modalState.userToDelete, userState.isSuperAdmin, userState.userId, showError, showSuccess, loadProfiles, user?.id]);

  const openDeleteModal = useCallback((profile: ProfileWithRole) => {
    setModalState(prev => ({
      ...prev,
      userToDelete: profile,
      isDeleteModalOpen: true,
    }));
  }, []);

  const closeDeleteModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isDeleteModalOpen: false,
      userToDelete: null,
    }));
  }, []);

  const handleSaveProfile = useCallback(async (updatedData: ProfileUpdateData) => {
    const profile = modalState.editingProfile;
    if (!profile) return;

    // Double-check permissions before saving
    if (!canEditProfile(profile)) {
      showError('Sie haben keine Berechtigung, dieses Profil zu bearbeiten. Nur Super-Administratoren können Admin- und Super-Admin-Profile bearbeiten.');
      setModalState(prev => ({ ...prev, editingProfile: null }));
      return;
    }


    // Prevent admins from assigning admin or super_admin roles to other users
    const isEditingOwnProfile = userState.userId && profile.id === userState.userId;
    if (!userState.isSuperAdmin && !isEditingOwnProfile && 
        (updatedData.role === 'admin' || updatedData.role === 'super_admin')) {
      showError('Sie haben keine Berechtigung, Admin- oder Super-Admin-Rollen zuzuweisen.');
      setModalState(prev => ({ ...prev, editingProfile: null }));
      return;
    }

    // Prevent admins from changing their own role (must keep current role)
    if (!userState.isSuperAdmin && isEditingOwnProfile) {
      if (updatedData.role !== profile.role) {
        showError('Sie können Ihre eigene Rolle nicht ändern.');
        setModalState(prev => ({ ...prev, editingProfile: null }));
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Update profile data
      const updateResult = await updateUserProfile(profile.id, {
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        email: updatedData.email,
        metabase_dashboard_id: updatedData.metabase_dashboard_id,
      });


      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Profil konnte nicht aktualisiert werden');
      }

      // Handle role change if different
      await handleRoleChange(profile.id, profile.role, updatedData.role);
      showSuccess('Profil erfolgreich aktualisiert');
      await loadProfiles();
      // Update refs after successful save
      hasLoadedProfilesRef.current = true;
      lastLoadedUserIdRef.current = user?.id || null;
      setModalState(prev => ({ ...prev, editingProfile: null }));
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Profil konnte nicht aktualisiert werden';
      setError(errorMessage);
      // Keep edit modal open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  }, [modalState.editingProfile, userState, canEditProfile, handleRoleChange, showError, showSuccess, loadProfiles, user?.id]);


  // ============================================================================
  // Render
  // ============================================================================

  // Show loading state while checking authorization or loading data
  if (!userState.isAuthorized || isLoading) {
    return (
      // <div className="main-container" style={{ 
      //   display: 'flex', 
      //   alignItems: 'center', 
      //   justifyContent: 'center',
      //   minHeight: 'calc(100vh - 40px)'
      // }}>
      <div className="main-container flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {!userState.isAuthorized ? "Autorisierung wird überprüft..." : "Profile werden geladen..."}
          </p>
          {error && (
            <div className="mt-6 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Seite neu laden
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    // <div className="main-container">
    <div className="main-container h-full p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Benutzerprofile-Verwaltung
        </h1>
        <div className="flex justify-between items-center">
          <p className="text-[var(--text-secondary)] text-sm">Benutzerprofile verwalten und Rollen zuweisen</p>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing || !userState.isAuthorized}
            className="px-4 py-2 rounded-xl bg-[var(--main-bg)] backdrop-blur-lg border border-[var(--border-color)] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Wird aktualisiert..." : "Aktualisieren"}
          </button>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Nach Name oder E-Mail suchen..."
          value={appState.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--input-bg)] backdrop-blur-sm border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-200 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[var(--danger-bg)] backdrop-blur-sm border border-[var(--danger-border)] rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--danger-text)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--danger-text)] flex-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-[var(--success-bg)] backdrop-blur-sm border border-[var(--success-border)] rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--success-text)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--success-text)] flex-1">{success}</p>
          </div>
        </div>
      )}

      {modalState.deletingUserId && (
        <div className="mb-6 p-4 bg-[var(--info-bg)] backdrop-blur-sm border border-[var(--info-border)] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-[var(--info-border)] border-t-blue-500 animate-spin" />
            </div>
            <p className="text-sm text-[var(--info-text)]">Benutzer wird gelöscht...</p>
          </div>
        </div>
      )}

      <div className="bg-[var(--main-bg)] backdrop-blur-lg rounded-2xl shadow-xl border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 border-b border-[var(--border-color)]">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort("first_name")}
                    className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)] hover:text-blue-600 transition-colors"
                  >
                    Vorname
                    {appState.sortField === "first_name" &&
                      (appState.sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort("last_name")}
                    className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)] hover:text-blue-600 transition-colors"
                  >
                    Nachname
                    {appState.sortField === "last_name" &&
                      (appState.sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort("email")}
                    className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)] hover:text-blue-600 transition-colors"
                  >
                    E-Mail
                    {appState.sortField === "email" &&
                      (appState.sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Rolle</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="flex items-center gap-2 font-semibold text-sm text-[var(--text-primary)] hover:text-blue-600 transition-colors"
                  >
                    Erstellt am
                    {appState.sortField === "created_at" &&
                      (appState.sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-4 text-center">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {pagination.paginatedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                        <Search className="h-8 w-8 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm">
                        {appState.searchQuery ? "Keine Profile gefunden" : "Keine Profile vorhanden"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagination.paginatedProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{profile.first_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{profile.last_name || "-"}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{profile.email || "-"}</td>
                    <td className="px-6 py-4">
                      {profile.role === "super_admin" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                          Super Admin
                        </span>
                      ) : profile.role === "admin" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                          Admin
                        </span>
                      ) : profile.role === "sales_support" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-lime-500 text-white shadow-sm">
                          Sales Support
                        </span>
                      ) : profile.role === "sales" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-sm">
                          Sales
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)] border border-[var(--border-color)]">
                          Staff Member
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {new Date(profile.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-2">
                        <button
                          onClick={() => handleEdit(profile)}
                          disabled={!canEditProfile(profile)}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          title="Profil bearbeiten"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {userState.isSuperAdmin && profile.id !== userState.userId && (
                          <button
                            onClick={() => openDeleteModal(profile)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 hover:scale-105"
                            title="Benutzer löschen"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Zeige {pagination.startIndex + 1} bis {Math.min(pagination.endIndex, filteredAndSortedProfiles.length)}{" "}
                von {filteredAndSortedProfiles.length} Profilen
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(appState.currentPage - 1)}
                  disabled={appState.currentPage === 1}
                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                  Seite {appState.currentPage} von {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(appState.currentPage + 1)}
                  disabled={appState.currentPage === pagination.totalPages}
                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalState.editingProfile && (
        <EditProfileModal
          profile={modalState.editingProfile}
          isOpen={true}
          onClose={() => setModalState((prev) => ({ ...prev, editingProfile: null }))}
          onSave={handleSaveProfile}
          isSaving={isSaving}
          currentUserIsSuperAdmin={userState.isSuperAdmin}
          isEditingOwnProfile={userState.userId ? modalState.editingProfile.id === userState.userId : false}
        />
      )}

      <DeleteConfirmationModal
        isOpen={modalState.isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteUser}
        title="Benutzerkonto löschen"
        message={
          modalState.userToDelete
            ? `Sind Sie sicher, dass Sie ${modalState.userToDelete.email || "diesen Benutzer"} löschen möchten? Dies entfernt das Konto und das zugehörige Profil.`
            : "Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?"
        }
      />
    </div>
  );
}

