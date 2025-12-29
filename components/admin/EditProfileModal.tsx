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
      { value: '', label: 'Staff Member' },
      { value: 'sales', label: 'Sales' },
      { value: 'sales_support', label: 'Sales Support' },
    ];

    if (currentUserIsSuperAdmin) {
      options.push(
        { value: 'admin', label: 'Admin' },
        // { value: 'super_admin', label: 'Super Admin' }
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
    // if (e.target === e.currentTarget) {
    //   onClose();
    // }
  }, [onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="settings-modal"
      style={{
        background: "rgba(54, 54, 54, 0.5)",
        backdropFilter: "blur(8px)",
        borderRadius: "16px",
      }}
      onClick={handleModalBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))",
          padding: "2px",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "fadeIn 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--main-bg)",
            backdropFilter: "blur(20px)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: "var(--border-color)" }}
          >
            <h3
              className="text-xl font-bold"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Profil bearbeiten
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.background = "var(--section-bg)"
                  e.currentTarget.style.color = "var(--text-primary)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--text-secondary)"
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Vorname
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  required
                  disabled={isSaving}
                  className="px-4 py-3 rounded-lg text-sm transition-all duration-200"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Nachname
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  required
                  disabled={isSaving}
                  className="px-4 py-3 rounded-lg text-sm transition-all duration-200"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Metabase Dashboard-ID
                </label>
                <input
                  type="number"
                  value={formData.metabase_dashboard_id?.toString() || ""}
                  onChange={(e) => handleMetabaseIdChange(e.target.value)}
                  disabled={isSaving}
                  placeholder="Optional"
                  className="px-4 py-3 rounded-lg text-sm transition-all duration-200"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Leave empty if not applicable
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Rolle
                </label>
                <select
                  key={`role-select-${profile.id}-${formData.role || "none"}`}
                  value={formData.role || ""}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isSaving || isEditingOwnProfile}
                  className="px-4 py-3 rounded-lg text-sm transition-all duration-200"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: isEditingOwnProfile ? "var(--section-bg)" : "var(--input-bg)",
                    color: "var(--text-primary)",
                    cursor: isEditingOwnProfile ? "not-allowed" : "pointer",
                    opacity: isEditingOwnProfile ? 0.6 : 1,
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    if (!isEditingOwnProfile) {
                      e.currentTarget.style.borderColor = "#3b82f6"
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)"
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {roleHelpText}
                </p>
              </div>

              <div
                className="flex items-center justify-end gap-3 pt-5 mt-1"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.background = "var(--section-bg)"
                      e.currentTarget.style.transform = "translateY(-1px)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--input-bg)"
                    e.currentTarget.style.transform = "translateY(0)"
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    color: "white",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.transform = "translateY(-1px)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  )
}

