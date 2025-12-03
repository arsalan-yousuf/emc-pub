'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Copy, Trash2, X, Inbox, Edit2 } from 'lucide-react';
import { fetchSummaries, deleteSummary, updateSummary, SummaryWithUser } from '@/lib/summaries-db';

interface HistoryTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
  refreshTrigger?: number;
}

function HistoryTab({ showToast, refreshTrigger = 0 }: HistoryTabProps) {
  const [history, setHistory] = useState<SummaryWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SummaryWithUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  // Load history from database
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const result = await fetchSummaries();
        if (result.success && result.data) {
          setHistory(result.data);
        } else {
          showToast?.('error', result.error || 'Failed to load summaries');
        }
      } catch (error) {
        console.error('Error loading history:', error);
        showToast?.('error', 'An error occurred while loading summaries');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [showToast, refreshTrigger]);

  // Filter history based on search
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) {
      return history;
    }

    const query = searchQuery.toLowerCase();
    return history.filter(item => {
      return (
        item.customer_name.toLowerCase().includes(query) ||
        (item.customer_email && item.customer_email.toLowerCase().includes(query)) ||
        (item.customer_phone && item.customer_phone.toLowerCase().includes(query)) ||
        item.transcript.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.language.toLowerCase().includes(query)
      );
    });
  }, [history, searchQuery]);

  const handleDeleteItem = async (id: string) => {
    if (confirm('Do you really want to delete this summary?')) {
      try {
        const result = await deleteSummary(id);
        if (result.success) {
          setHistory(prev => prev.filter(item => item.id !== id));
          if (selectedItem && selectedItem.id === id) {
            setSelectedItem(null);
          }
          showToast?.('success', 'Summary deleted successfully');
        } else {
          showToast?.('error', result.error || 'Failed to delete summary');
        }
      } catch (error) {
        console.error('Error deleting summary:', error);
        showToast?.('error', 'An error occurred while deleting the summary');
      }
    }
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast?.('success', 'Summary copied to clipboard!');
  };

  const handleEditSummary = () => {
    if (selectedItem) {
      setEditedSummary(selectedItem.summary);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const result = await updateSummary(selectedItem.id!, { summary: editedSummary });
      if (result.success) {
        setHistory(prev => prev.map(item => 
          item.id === selectedItem.id ? { ...item, summary: editedSummary } : item
        ));
        setSelectedItem({ ...selectedItem, summary: editedSummary });
        setIsEditing(false);
        showToast?.('success', 'Summary updated successfully');
      } else {
        showToast?.('error', result.error || 'Failed to update summary');
      }
    } catch (error) {
      console.error('Error updating summary:', error);
      showToast?.('error', 'An error occurred while updating the summary');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSummary('');
  };

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

  const getPreviewText = (text: string, maxLength: number = 150) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="tab-content active">
      <div className="history-container">
        {isLoading ? (
          <div className="history-loading">
            <div className="loading-spinner"></div>
            <p>Loading summaries...</p>
          </div>
        ) : (
          <>
            <div className="history-search">
              <input 
                type="text" 
                placeholder="Search by customer, transcript, or summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid var(--border-color)', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  background: 'var(--input-bg)', 
                  color: 'var(--text-primary)' 
                }}
              />
            </div>
        
            <div className="history-content">
              <div className="history-list">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Inbox className="h-12 w-12 text-gray-400" />
                    </div>
                    <p>No summaries yet</p>
                    <small>Your generated summaries will appear here</small>
                  </div>
                ) : (
                  <div className="history-items">
                    {filteredHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className={`history-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsEditing(false);
                        }}
                      >
                        <div className="history-header">
                          <div className="history-meta">
                            {formatDate(item.created_at || '')}
                            {item.user_name && (
                              <span style={{ marginLeft: '10px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                by {item.user_name}
                              </span>
                            )}
                          </div>
                          <div className="history-item-actions">
                            <button 
                              className="history-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySummary(item.summary);
                              }}
                              title="Copy"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button 
                              className="history-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id!);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="history-subject">{item.customer_name}</div>
                        <div className="history-preview">{getPreviewText(item.summary, 150)}</div>
                        <div className="history-item-settings">
                          <small>
                            {item.language} • {item.customer_email || item.customer_phone || 'No contact'}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          
              {selectedItem && (
                <div className="history-detail">
                  <div className="history-detail-header">
                    <h3>Summary Details</h3>
                    <button 
                      className="close-detail"
                      onClick={() => {
                        setSelectedItem(null);
                        setIsEditing(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="history-detail-content">
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4>Summary:</h4>
                        {!isEditing && (
                          <button
                            className="action-button"
                            onClick={handleEditSummary}
                            style={{ padding: '8px 16px', fontSize: '14px' }}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div>
                          <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            rows={15}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '8px',
                              fontSize: '14px',
                              background: 'var(--input-bg)',
                              color: 'var(--text-primary)',
                              fontFamily: 'inherit',
                              resize: 'vertical'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                              className="action-button"
                              onClick={handleSaveEdit}
                            >
                              Save
                            </button>
                            <button
                              className="action-button"
                              onClick={handleCancelEdit}
                              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="email-content">
                          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{selectedItem.summary}</pre>
                        </div>
                      )}
                    </div>
                    <div className="detail-actions">
                      <button 
                        className="action-button"
                        onClick={() => handleCopySummary(selectedItem.summary)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy Summary
                      </button>
                      <button 
                        className="action-button"
                        onClick={() => handleCopySummary(selectedItem.transcript)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy Transcript
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(HistoryTab);

