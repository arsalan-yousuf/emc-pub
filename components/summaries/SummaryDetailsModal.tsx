'use client';

import React, { useState, useEffect } from 'react';
import { Copy, X, FileText, Edit2, Save, XCircle } from 'lucide-react';
import { SummaryWithUser, updateSummary } from '@/lib/summaries-db';

interface SummaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: SummaryWithUser | null;
  onCopySummary?: (text: string, type: 'summary' | 'transcript', e?: React.MouseEvent<HTMLButtonElement>) => void;
  onSummaryUpdated?: () => void;
  canEdit?: boolean;
}

export default function SummaryDetailsModal({ 
  isOpen, 
  onClose, 
  selectedItem,
  onCopySummary,
  onSummaryUpdated,
  canEdit = false
}: SummaryDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    customer_name: '',
    customer_partner: '',
    customer_email: '',
    customer_phone: '',
    transcript: '',
    summary: ''
  });

  // Initialize edited data when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setEditedData({
        customer_name: selectedItem.customer_name || '',
        customer_partner: selectedItem.customer_partner || '',
        customer_email: selectedItem.customer_email || '',
        customer_phone: selectedItem.customer_phone || '',
        transcript: selectedItem.transcript || '',
        summary: selectedItem.summary || ''
      });
      setIsEditing(false);
    }
  }, [selectedItem]);

  if (!isOpen || !selectedItem) return null;

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isEditing) {
      onClose();
    }
  };

  const handleEdit = () => {
    if (!canEdit) return;
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to original values
    if (selectedItem) {
      setEditedData({
        customer_name: selectedItem.customer_name || '',
        customer_partner: selectedItem.customer_partner || '',
        customer_email: selectedItem.customer_email || '',
        customer_phone: selectedItem.customer_phone || '',
        transcript: selectedItem.transcript || '',
        summary: selectedItem.summary || ''
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedItem?.id) return;

    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSummary(selectedItem.id, {
        customer_name: editedData.customer_name,
        customer_partner: editedData.customer_partner || undefined,
        customer_email: editedData.customer_email || undefined,
        customer_phone: editedData.customer_phone || undefined,
        transcript: editedData.transcript,
        summary: editedData.summary
      });

      if (result.success) {
        setIsEditing(false);
        onSummaryUpdated?.();
        // Update selectedItem with new data
        Object.assign(selectedItem, editedData);
      } else {
        alert(result.error || 'Zusammenfassung konnte nicht aktualisiert werden');
      }
    } catch (error) {
      console.error('Error updating summary:', error);
      alert('Beim Aktualisieren der Zusammenfassung ist ein Fehler aufgetreten');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="summaryDetailsModal" className="settings-modal" onClick={handleModalBackdropClick} translate="no">
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="h-5 w-5" />
            Zusammenfassungsdetails
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditing ? (
              canEdit ? (
                <button 
                  type="button"
                  className="action-button"
                  onClick={handleEdit}
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  <Edit2 className="h-4 w-4" />
                  Bearbeiten
                </button>
              ) : null
            ) : (
              <>
                <button 
                  type="button"
                  className="action-button"
                  onClick={handleSave}
                  disabled={isSaving || !canEdit}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '14px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button 
                  type="button"
                  className="action-button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '14px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Abbrechen
                </button>
              </>
            )}
            <button 
              type="button"
              className="close-modal"
              onClick={onClose}
              disabled={isEditing}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="settings-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="detail-section" translate="no">
            <h4>Kundeninformationen:</h4>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Name:</label>
                  <input
                    type="text"
                    value={editedData.customer_name}
                    onChange={(e) => setEditedData({ ...editedData, customer_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Partner:</label>
                  <input
                    type="text"
                    value={editedData.customer_partner}
                    onChange={(e) => setEditedData({ ...editedData, customer_partner: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>E-Mail:</label>
                  <input
                    type="email"
                    value={editedData.customer_email}
                    onChange={(e) => setEditedData({ ...editedData, customer_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Telefon:</label>
                  <input
                    type="tel"
                    value={editedData.customer_phone}
                    onChange={(e) => setEditedData({ ...editedData, customer_phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div className="settings-info">
                  <p><strong>Sprache:</strong> {selectedItem.language}</p>
                  <p><strong>Erstellt:</strong> {formatDate(selectedItem.created_at || '')}</p>
                  {selectedItem.user_name && (
                    <p><strong>Erstellt von:</strong> {selectedItem.user_name} ({selectedItem.user_email})</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="settings-info">
                <p><strong>Name:</strong> {selectedItem.customer_name}</p>
                {selectedItem.customer_partner && (
                  <p><strong>Partner:</strong> {selectedItem.customer_partner}</p>
                )}
                {selectedItem.customer_email && (
                  <p><strong>E-Mail:</strong> {selectedItem.customer_email}</p>
                )}
                {selectedItem.customer_phone && (
                  <p><strong>Telefon:</strong> {selectedItem.customer_phone}</p>
                )}
                <p><strong>Sprache:</strong> {selectedItem.language}</p>
                <p><strong>Erstellt:</strong> {formatDate(selectedItem.created_at || '')}</p>
                {selectedItem.user_name && (
                  <p><strong>Erstellt von:</strong> {selectedItem.user_name} ({selectedItem.user_email})</p>
                )}
              </div>
            )}
          </div>
          <div className="detail-section">
            <h4>Transkript:</h4>
            <textarea
              translate="no"
              value={isEditing ? editedData.transcript : selectedItem.transcript}
              readOnly={!isEditing}
              onChange={(e) => setEditedData({ ...editedData, transcript: e.target.value })}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: isEditing
                  ? '1px solid var(--border-color)'
                  : 'none',
                borderRadius: '6px',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                cursor: isEditing ? 'text' : 'default',
                outline: 'none'
              }}
            />
          </div>
          <div className="detail-section">
            <h4>Zusammenfassung:</h4>
            <textarea
              translate="no"
              value={isEditing ? editedData.summary : selectedItem.summary}
              readOnly={!isEditing}
              onChange={(e) => setEditedData({ ...editedData, summary: e.target.value })}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                border: isEditing
                  ? '1px solid var(--border-color)'
                  : 'none',
                borderRadius: '6px',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                cursor: isEditing ? 'text' : 'default',
                outline: 'none'
              }}
            />
          </div>
          {!isEditing && (
            <div className="detail-actions">
              <button 
                type="button"
                className="action-button"
                onClick={(e) => onCopySummary?.(selectedItem.summary, 'summary', e)}
              >
                <Copy className="h-4 w-4" />
                Zusammenfassung kopieren
              </button>
              <button 
                type="button"
                className="action-button"
                onClick={(e) => onCopySummary?.(selectedItem.transcript, 'transcript', e)}
              >
                <Copy className="h-4 w-4" />
                Transkript kopieren
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

