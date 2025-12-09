'use client';

import React from 'react';
import { Copy, X, FileText } from 'lucide-react';
import { SummaryWithUser } from '@/lib/summaries-db';

interface SummaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: SummaryWithUser | null;
  onCopySummary?: (text: string, type: 'summary' | 'transcript', e?: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function SummaryDetailsModal({ 
  isOpen, 
  onClose, 
  selectedItem,
  onCopySummary 
}: SummaryDetailsModalProps) {
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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div id="summaryDetailsModal" className="settings-modal" onClick={handleModalBackdropClick}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="h-5 w-5" />
            Summary Details
          </h3>
          <button 
            type="button"
            className="close-modal"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="settings-body">
          <div className="detail-section">
            <h4>Customer Information:</h4>
            <div className="settings-info">
              <p><strong>Name:</strong> {selectedItem.customer_name}</p>
              {selectedItem.customer_email && (
                <p><strong>Email:</strong> {selectedItem.customer_email}</p>
              )}
              {selectedItem.customer_phone && (
                <p><strong>Phone:</strong> {selectedItem.customer_phone}</p>
              )}
              <p><strong>Language:</strong> {selectedItem.language}</p>
              <p><strong>Created:</strong> {formatDate(selectedItem.created_at || '')}</p>
              {selectedItem.user_name && (
                <p><strong>Created by:</strong> {selectedItem.user_name} ({selectedItem.user_email})</p>
              )}
            </div>
          </div>
          <div className="detail-section">
            <h4>Transcript:</h4>
            <div className="email-content">
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{selectedItem.transcript}</pre>
            </div>
          </div>
          <div className="detail-section">
            <h4>Summary:</h4>
            <div className="email-content">
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{selectedItem.summary}</pre>
            </div>
          </div>
          <div className="detail-actions">
            <button 
              type="button"
              className="action-button"
              onClick={(e) => onCopySummary?.(selectedItem.summary, 'summary', e)}
            >
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
            <button 
              type="button"
              className="action-button"
              onClick={(e) => onCopySummary?.(selectedItem.transcript, 'transcript', e)}
            >
              <Copy className="h-4 w-4" />
              Copy Transcript
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

