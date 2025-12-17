'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserRole } from '@/lib/user-roles';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  metabase_dashboard_id: number | null;
  role: string | null;
}

interface EditProfileModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    first_name: string;
    last_name: string;
    email: string;
    metabase_dashboard_id: number | null;
    role: UserRole | null;
  }) => void;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [metabaseDashboardId, setMetabaseDashboardId] = useState<string>('');
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (profile && isOpen) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setEmail(profile.email || '');
      setMetabaseDashboardId(profile.metabase_dashboard_id?.toString() || '');
      // Ensure role is properly set - handle both string and UserRole types
      const profileRole = profile.role;
      if (profileRole) {
        // Normalize the role value to match enum values
        const normalizedRole = String(profileRole).trim();
        if (['super_admin', 'admin', 'sales_support', 'sales'].includes(normalizedRole)) {
          setRole(normalizedRole as UserRole);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false; // Prevent any form submission
  };

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Always call onSave which will show confirmation modal
    // The actual save happens after confirmation
    onSave({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      metabase_dashboard_id: metabaseDashboardId.trim() ? parseInt(metabaseDashboardId.trim()) : null,
      role: role
    });
    // Explicitly return false to prevent any form submission
    return false;
  };

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
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={metabaseDashboardId}
                  onChange={(e) => setMetabaseDashboardId(e.target.value)}
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
                  key={`role-select-${profile.id}-${role || 'none'}`}
                  value={role || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setRole(selectedValue ? (selectedValue as UserRole) : null);
                  }}
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
                  <option value="">Keine Rolle</option>
                  <option value="sales">Verkauf</option>
                  <option value="sales_support">Verkaufsunterstützung</option>
                  {currentUserIsSuperAdmin && (
                    <>
                      <option value="admin" key="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </>
                  )}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {isEditingOwnProfile 
                    ? 'You cannot change your own role' 
                    : currentUserIsSuperAdmin 
                    ? 'You can assign any role' 
                    : 'You can only assign Sales or Sales Support roles'}
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
                  background: isSaving 
                    ? 'var(--muted)' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  minWidth: '100px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  opacity: isSaving ? 0.6 : 1
                }}
              >
                {isSaving ? 'Wird gespeichert...' : 'Änderungen speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

