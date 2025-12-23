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
import { Edit2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
      <div className="main-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 'calc(100vh - 40px)'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
            {!userState.isAuthorized ? 'Autorisierung wird überprüft...' : 'Profile werden geladen...'}
          </p>
          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '8px',
              color: 'var(--danger-text)',
              fontSize: '14px',
              maxWidth: '500px',
              margin: '20px auto 0'
            }}>
              {error}
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  background: 'var(--danger-text)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Seite neu laden
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Benutzerprofile-Verwaltung
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Benutzerprofile verwalten und Rollen zuweisen
            </p>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing || !userState.isAuthorized}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                cursor: (isLoading || isRefreshing || !userState.isAuthorized) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                opacity: (isLoading || isRefreshing || !userState.isAuthorized) ? 0.6 : 1
              }}
              title="Profile aktualisieren"
            >
              <RefreshCw 
                style={{ 
                  width: '16px', 
                  height: '16px',
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                }} 
              />
              {isRefreshing ? 'Wird aktualisiert...' : 'Aktualisieren'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nach Name oder E-Mail suchen..."
            value={appState.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: '8px',
            color: 'var(--danger-text)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: '8px',
            color: 'var(--success-text)',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {modalState.deletingUserId && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'var(--section-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div className="loading" style={{ width: '18px', height: '18px', borderWidth: '3px' }}></div>
            Deleting user account...
          </div>
        )}

        {/* Table */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--section-bg)', borderBottom: '2px solid var(--border-color)' }}>
                  <th
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => handleSort('first_name')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Vorname
                      {appState.sortField === 'first_name' && (
                        appState.sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => handleSort('last_name')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Nachname
                      {appState.sortField === 'last_name' && (
                        appState.sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => handleSort('email')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Email
                      {appState.sortField === 'email' && (
                        appState.sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Metabase Dashboard-ID
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Rolle
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {appState.searchQuery ? 'Keine Profile gefunden, die Ihrer Suche entsprechen' : 'Keine Profile gefunden'}
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedProfiles.map((profile) => (
                    <tr
                      key={profile.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--section-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {profile.first_name || '-'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {profile.last_name || '-'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {profile.email || '-'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {profile.metabase_dashboard_id || '-'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        {profile.role ? (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--section-bg)',
                            fontSize: '13px',
                            textTransform: 'capitalize'
                          }}>
                            {profile.role.replace('_', ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Staff Member</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {canEditProfile(profile) ? (
                          <button
                            onClick={() => handleEdit(profile)}
                            disabled={isSaving || modalState.deletingUserId === profile.id}
                            style={{
                              padding: '8px 12px',
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--section-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                            Bearbeiten
                          </button>
                        ) : (
                          <span style={{
                            padding: '8px 12px',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            fontStyle: 'italic'
                          }}>
                            Eingeschränkt
                          </span>
                        )}

                        {userState.isSuperAdmin && (
                          <button
                            onClick={() => openDeleteModal(profile)}
                            disabled={modalState.deletingUserId === profile.id || isSaving}
                            style={{
                              padding: '8px 12px',
                              background: 'transparent',
                              border: '1px solid var(--danger-border)',
                              borderRadius: '6px',
                              color: 'var(--danger-text)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--danger-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {modalState.deletingUserId === profile.id ? (
                              <>
                                <div className="loading" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                                Wird gelöscht...
                              </>
                            ) : (
                              'Löschen'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Zeige {pagination.startIndex + 1} bis {Math.min(pagination.endIndex, filteredAndSortedProfiles.length)} von {filteredAndSortedProfiles.length} Profilen
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handlePageChange(Math.max(1, appState.currentPage - 1))}
                  disabled={appState.currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: appState.currentPage === 1 ? 'var(--section-bg)' : 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    cursor: appState.currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px'
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '0 8px' }}>
                  Seite {appState.currentPage} von {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(pagination.totalPages, appState.currentPage + 1))}
                  disabled={appState.currentPage === pagination.totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: appState.currentPage === pagination.totalPages ? 'var(--section-bg)' : 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    cursor: appState.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px'
                  }}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {modalState.editingProfile && (
        <EditProfileModal
          profile={modalState.editingProfile}
          isOpen={true}
          onClose={() => setModalState(prev => ({ ...prev, editingProfile: null }))}
          onSave={handleSaveProfile}
          isSaving={isSaving}
          currentUserIsSuperAdmin={userState.isSuperAdmin}
          isEditingOwnProfile={userState.userId ? modalState.editingProfile.id === userState.userId : false}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={modalState.isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteUser}
        title="Benutzerkonto löschen"
        message={
          modalState.userToDelete
            ? `Sind Sie sicher, dass Sie ${modalState.userToDelete.email || 'diesen Benutzer'} löschen möchten? Dies entfernt das Konto und das zugehörige Profil.`
            : 'Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?'
        }
      />

    </div>
  );
}

