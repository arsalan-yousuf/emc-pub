'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = 'Delete Summary',
  message = 'Are you sure you want to delete this summary? This action cannot be undone.'
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div id="deleteConfirmationModal" className="settings-modal" onClick={handleModalBackdropClick}>
      <div 
        className="settings-modal-content" 
        style={{ 
          maxWidth: '500px', 
          width: '90vw',
          height: 'auto',
          maxHeight: '90vh'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle className="h-5 w-5" />
            {title}
          </h3>
          <button 
            type="button"
            className="close-modal"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="settings-body" style={{ flex: '0 0 auto' }}>
          <div style={{ padding: '20px 0' }}>
            <p style={{ marginBottom: '30px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="action-button"
                onClick={onClose}
                style={{ 
                  background: 'var(--input-bg)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-color)',
                  minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleConfirm}
                style={{ 
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  border: 'none',
                  minWidth: '100px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

