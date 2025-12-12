'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Copy, Trash2, Inbox, Users } from 'lucide-react';
import { fetchAllSummariesForView, SummaryWithUser } from '@/lib/summaries-db';

interface ViewSummariesTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
  refreshTrigger?: number;
  onOpenSummaryModal?: (item: SummaryWithUser) => void;
  onRequestDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function ViewSummariesTab({ showToast, refreshTrigger = 0, onOpenSummaryModal, onRequestDelete, isDeleting = false }: ViewSummariesTabProps) {
  const [summaries, setSummaries] = useState<SummaryWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load summaries from database
  useEffect(() => {
    const loadSummaries = async () => {
      setIsLoading(true);
      try {
        const result = await fetchAllSummariesForView();
        if (result.success && result.data) {
          setSummaries(result.data);
        } else {
          showToast?.('error', result.error || 'Failed to load summaries');
        }
      } catch (error) {
        console.error('Error loading summaries:', error);
        showToast?.('error', 'An error occurred while loading summaries');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Filter summaries based on search
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) {
      return summaries;
    }

    const query = searchQuery.toLowerCase();
    return summaries.filter(item => {
      return (
        item.customer_name.toLowerCase().includes(query) ||
        (item.customer_email && item.customer_email.toLowerCase().includes(query)) ||
        (item.customer_phone && item.customer_phone.toLowerCase().includes(query)) ||
        item.transcript.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.language.toLowerCase().includes(query) ||
        (item.user_name && item.user_name.toLowerCase().includes(query)) ||
        (item.user_email && item.user_email.toLowerCase().includes(query))
      );
    });
  }, [summaries, searchQuery]);

  // Group summaries by user
  const groupedSummaries = useMemo(() => {
    const groups = new Map<string, SummaryWithUser[]>();
    
    filteredSummaries.forEach(summary => {
      const userKey = summary.user_id;
      if (!groups.has(userKey)) {
        groups.set(userKey, []);
      }
      groups.get(userKey)!.push(summary);
    });

    // Convert to array and sort by user name
    return Array.from(groups.entries()).map(([userId, userSummaries]) => ({
      userId,
      userName: userSummaries[0].user_name || userSummaries[0].user_email || 'Unknown User',
      userEmail: userSummaries[0].user_email || '',
      summaries: userSummaries.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      })
    })).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [filteredSummaries]);

  const handleDeleteItem = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRequestDelete?.(id);
  };

  const handleCopySummary = async (
    text: string, 
    type: 'summary' | 'transcript',
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await navigator.clipboard.writeText(text);
      const message = type === 'summary' 
        ? 'Summary copied to clipboard!' 
        : 'Transcript copied to clipboard!';
      showToast?.('success', message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast?.('error', 'Failed to copy to clipboard');
    }
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
        {(isLoading || isDeleting) ? (
          <div className="history-loading">
            <div className="loading-spinner"></div>
            <p>{isDeleting ? 'Deleting summary...' : 'Loading summaries...'}</p>
          </div>
        ) : (
          <>
            <div className="history-search">
              <input 
                type="text" 
                placeholder="Search by customer, user, transcript, or summary..."
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
                {groupedSummaries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Inbox className="h-12 w-12 text-gray-400" />
                    </div>
                    <p>No summaries found</p>
                    <small>Summaries from other users will appear here</small>
                  </div>
                ) : (
                  <div className="history-items">
                    {groupedSummaries.map((group) => (
                      <div key={group.userId} className="user-group" style={{ marginBottom: '32px' }}>
                        <div className="user-group-header" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          background: 'var(--section-bg)',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <Users className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {group.userName}
                            </div>
                            {group.userEmail && (
                              <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                {group.userEmail}
                              </div>
                            )}
                            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {group.summaries.length} {group.summaries.length === 1 ? 'summary' : 'summaries'}
                            </div>
                          </div>
                        </div>
                        <div style={{ paddingLeft: '8px' }}>
                          {group.summaries.map((item) => (
                            <div 
                              key={item.id} 
                              className="history-item"
                              onClick={() => {
                                onOpenSummaryModal?.(item);
                              }}
                            >
                              <div className="history-header">
                                <div className="history-meta">
                                  {formatDate(item.created_at || '')}
                                </div>
                                <div className="history-item-actions">
                                  <button 
                                    className="history-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopySummary(item.summary, 'summary');
                                    }}
                                    title="Copy"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button 
                                    className="history-btn"
                                    onClick={(e) => handleDeleteItem(item.id!, e)}
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(ViewSummariesTab);

