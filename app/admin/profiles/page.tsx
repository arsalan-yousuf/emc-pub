'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isAdmin, isSuperAdmin, grantRoleToUser, revokeRoleFromUser, type UserRole } from '@/lib/user-roles';
import { fetchProfiles, type ProfileWithRole } from '@/lib/profiles-server';
import { useRouter } from 'next/navigation';
import { Edit2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User, Shield } from 'lucide-react';
import EditProfileModal from '@/components/admin/EditProfileModal';


type SortField = 'first_name' | 'last_name' | 'email' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function AdminProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingProfile, setEditingProfile] = useState<ProfileWithRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Check authorization and load profiles
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const admin = await isAdmin();
      if (!admin) {
        router.push('/dashboard');
        return;
      }
      setIsAuthorized(true);
      const superAdmin = await isSuperAdmin();
      setCurrentUserIsSuperAdmin(superAdmin);
      
      loadProfiles();
    };
    checkAuthAndLoad();
  }, [router]);

  // Load profiles using server action
  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetchProfiles();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load profiles');
      }

      if (result.data) {
        setProfiles(result.data);
      } else {
        setProfiles([]);
      }

      // Set current user ID and super admin status from server response
      if (result.currentUserId) {
        setCurrentUserId(result.currentUserId);
      }
      if (result.isSuperAdmin !== undefined) {
        setCurrentUserIsSuperAdmin(result.isSuperAdmin);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : 'Failed to load profiles. Please check your permissions and ensure RLS policies are configured correctly.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort profiles
  useEffect(() => {
    let filtered = [...profiles];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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

      switch (sortField) {
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
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredProfiles(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [profiles, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Check if current user can edit a profile
  const canEditProfile = (profile: ProfileWithRole): boolean => {
    // Super admins can edit anyone
    if (currentUserIsSuperAdmin) {
      return true;
    }
    // Users can always edit their own profile
    if (currentUserId && profile.id === currentUserId) {
      return true;
    }
    // Admins can only edit sales and sales_support, not admin or super_admin
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      return false;
    }
    return true;
  };

  // Handle edit
  const handleEdit = (profile: ProfileWithRole) => {
    if (!canEditProfile(profile)) {
      setError('You do not have permission to edit this profile. Only super admins can edit admin and super admin profiles.');
      setTimeout(() => setError(null), 5000);
      return;
    }
    setEditingProfile(profile);
  };

  // Handle save profile - directly saves without confirmation
  const handleSaveProfile = async (updatedData: {
    first_name: string;
    last_name: string;
    email: string;
    metabase_dashboard_id: number | null;
    role: UserRole | null;
  }) => {
    if (!editingProfile) {
      return;
    }

    // Double-check permissions before saving
    if (!canEditProfile(editingProfile)) {
      setError('You do not have permission to edit this profile. Only super admins can edit admin and super admin profiles.');
      setEditingProfile(null);
      return;
    }

    // Prevent admins from assigning admin or super_admin roles to other users
    const isEditingOwnProfile = currentUserId && editingProfile.id === currentUserId;
    if (!currentUserIsSuperAdmin && !isEditingOwnProfile && (updatedData.role === 'admin' || updatedData.role === 'super_admin')) {
      setError('You do not have permission to assign admin or super admin roles.');
      setEditingProfile(null);
      return;
    }

    // Prevent admins from changing their own role (must keep current role)
    if (!currentUserIsSuperAdmin && isEditingOwnProfile) {
      const currentRole = editingProfile.role;
      if (updatedData.role !== currentRole) {
        setError('You cannot change your own role.');
        setEditingProfile(null);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      
      // Update profile data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: updatedData.first_name,
          last_name: updatedData.last_name,
          email: updatedData.email,
          metabase_dashboard_id: updatedData.metabase_dashboard_id
        })
        .eq('id', editingProfile.id)
        .select();
      
      if (updateError) {
        throw updateError;
      }

      // Handle role change if different
      const currentRole = editingProfile.role;
      const newRole = updatedData.role;

      if (currentRole !== newRole) {
        // Case 1: Assigning "No Role" (newRole is null) - only revoke existing role
        if (!newRole && currentRole) {
          const revokeResult = await revokeRoleFromUser(editingProfile.id, currentRole);
          if (!revokeResult.success) {
            if (!revokeResult.error?.includes('not found') && !revokeResult.error?.includes('does not exist')) {
              throw new Error(revokeResult.error || 'Failed to revoke role');
            }
          }
        }
        // Case 2: Assigning role from "No Role" (currentRole is null) - only grant new role
        else if (newRole && !currentRole) {
          const grantResult = await grantRoleToUser(editingProfile.id, newRole);
          if (!grantResult.success) {
            throw new Error(grantResult.error || 'Failed to grant role');
          }
        }
        // Case 3: Changing from one role to another - revoke old and grant new
        else if (currentRole && newRole) {
          const revokeResult = await revokeRoleFromUser(editingProfile.id, currentRole);
          if (!revokeResult.success) {
            if (!revokeResult.error?.includes('not found') && !revokeResult.error?.includes('does not exist')) {
              throw new Error(revokeResult.error || 'Failed to revoke role');
            }
          }
          const grantResult = await grantRoleToUser(editingProfile.id, newRole);
          if (!grantResult.success) {
            throw new Error(grantResult.error || 'Failed to grant role');
          }
        }
      }

      setSuccess('Profile updated successfully');
      await loadProfiles();
      
      // Close edit modal after successful save
      setEditingProfile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      // Keep edit modal open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };


  if (!isAuthorized) {
    return (
      <div className="main-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="main-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            User Profiles Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage user profiles and assign roles
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                      First Name
                      {sortField === 'first_name' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
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
                      Last Name
                      {sortField === 'last_name' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
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
                      {sortField === 'email' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Metabase Dashboard ID
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Role
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {searchQuery ? 'No profiles found matching your search' : 'No profiles found'}
                    </td>
                  </tr>
                ) : (
                  paginatedProfiles.map((profile) => (
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
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No Role</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {canEditProfile(profile) ? (
                          <button
                            onClick={() => handleEdit(profile)}
                            disabled={isSaving}
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
                            Edit
                          </button>
                        ) : (
                          <span style={{
                            padding: '8px 12px',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            fontStyle: 'italic'
                          }}>
                            Restricted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredProfiles.length)} of {filteredProfiles.length} profiles
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: currentPage === 1 ? 'var(--section-bg)' : 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px'
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? 'var(--section-bg)' : 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px'
                  }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveProfile}
          isSaving={isSaving}
          currentUserIsSuperAdmin={currentUserIsSuperAdmin}
          isEditingOwnProfile={currentUserId ? editingProfile.id === currentUserId : false}
        />
      )}

    </div>
  );
}

