'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { UserRole, USER_ROLES } from '@/lib/user-roles';

// ============================================================================
// Type Definitions
// ============================================================================

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  metabase_dashboard_id: number | null;
  role: string | null;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  metabase_dashboard_id: number | null;
  role: UserRole | null;
}

interface EditProfileModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormData) => void;
  isSaving: boolean;
  currentUserIsSuperAdmin: boolean;
  isEditingOwnProfile?: boolean;
}


export default function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onSave,
  isSaving,
  currentUserIsSuperAdmin,
  isEditingOwnProfile = false
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    metabase_dashboard_id: null,
    role: null,
  });

  // Initialize form data when profile or modal opens
  useEffect(() => {
    if (profile && isOpen) {
      const normalizedRole = profile.role 
        ? (USER_ROLES.includes(profile.role as UserRole) ? (profile.role as UserRole) : null)
        : null;

      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        metabase_dashboard_id: profile.metabase_dashboard_id,
        role: normalizedRole,
      });
    }
  }, [profile, isOpen]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const updateField = useCallback(<K extends keyof ProfileFormData>(
    field: K,
    value: ProfileFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMetabaseIdChange = useCallback((value: string) => {
    const numValue = value.trim() ? parseInt(value.trim(), 10) : null;
    updateField('metabase_dashboard_id', isNaN(numValue as number) ? null : numValue);
  }, [updateField]);

  const handleRoleChange = useCallback((value: string) => {
    updateField('role', value ? (value as UserRole) : null);
  }, [updateField]);

  const handleSave = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    onSave({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      metabase_dashboard_id: formData.metabase_dashboard_id,
      role: formData.role,
    });
  }, [formData, onSave]);

  const roleOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Keine Rolle' },
      { value: 'sales', label: 'Verkauf' },
      { value: 'sales_support', label: 'Verkaufsunterstützung' },
    ];

    if (currentUserIsSuperAdmin) {
      options.push(
        { value: 'admin', label: 'Admin' },
        { value: 'super_admin', label: 'Super Admin' }
      );
    }

    return options;
  }, [currentUserIsSuperAdmin]);

  const roleHelpText = useMemo(() => {
    if (isEditingOwnProfile) return 'You cannot change your own role';
    if (currentUserIsSuperAdmin) return 'You can assign any role';
    return 'You can only assign Sales or Sales Support roles';
  }, [isEditingOwnProfile, currentUserIsSuperAdmin]);

  const handleModalBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="settings-modal" onClick={handleModalBackdropClick}>
      <div
        className="settings-modal-content"
        style={{
          maxWidth: '600px',
          width: '90vw',
          height: 'auto',
          maxHeight: '90vh',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h3>Profil bearbeiten</h3>
          <button
            type="button"
            className="close-modal"
            onClick={onClose}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="settings-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '24px' }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }} 
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Vorname
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  required
                  disabled={isSaving}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Nachname
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  required
                  disabled={isSaving}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  disabled={isSaving}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Metabase Dashboard-ID
                </label>
                <input
                  type="number"
                  value={formData.metabase_dashboard_id?.toString() || ''}
                  onChange={(e) => handleMetabaseIdChange(e.target.value)}
                  disabled={isSaving}
                  placeholder="Optional"
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Leave empty if not applicable
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Rolle
                </label>
                <select
                  key={`role-select-${profile.id}-${formData.role || 'none'}`}
                  value={formData.role || ''}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isSaving || isEditingOwnProfile}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: isEditingOwnProfile ? 'var(--section-bg)' : 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%',
                    cursor: isEditingOwnProfile ? 'not-allowed' : 'pointer',
                    opacity: isEditingOwnProfile ? 0.6 : 1
                  }}
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {roleHelpText}
                </p>
              </div>

            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="action-button"
                onClick={onClose}
                disabled={isSaving}
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  minWidth: '100px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.background = 'var(--section-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--input-bg)';
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="action-button"
                disabled={isSaving}
                onClick={handleSave}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  minWidth: '140px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  pointerEvents: isSaving ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" style={{ flexShrink: 0 }} />
                    <span>Wird gespeichert...</span>
                  </>
                ) : (
                  <span>Änderungen speichern</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

