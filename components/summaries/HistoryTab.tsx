'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Copy, Trash2, Inbox } from 'lucide-react';
import { fetchSummaries, SummaryWithUser } from '@/lib/summaries-db';

interface HistoryTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
  refreshTrigger?: number;
  onOpenSummaryModal?: (item: SummaryWithUser) => void;
  onRequestDelete?: (id: string) => void;
  isDeleting?: boolean;
  canDelete?: boolean;
}

function HistoryTab({ showToast, refreshTrigger = 0, onOpenSummaryModal, onRequestDelete, isDeleting = false, canDelete = false }: HistoryTabProps) {
  const [history, setHistory] = useState<SummaryWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

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
        ? 'Zusammenfassung in die Zwischenablage kopiert!' 
        : 'Transkript in die Zwischenablage kopiert!';
      showToast?.('success', message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast?.('error', 'In die Zwischenablage kopieren fehlgeschlagen');
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
            <p>{isDeleting ? 'Zusammenfassung wird gelöscht...' : 'Zusammenfassungen werden geladen...'}</p>
          </div>
        ) : (
          <>
            <div className="history-search">
              <input 
                type="text" 
                placeholder="Nach Kunde, Transkript oder Zusammenfassung suchen..."
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
                    <p>Noch keine Zusammenfassungen</p>
                    <small>Ihre generierten Zusammenfassungen werden hier angezeigt</small>
                  </div>
                ) : (
                  <div className="history-items">
                    {filteredHistory.map((item) => (
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
                            {item.user_name && (
                              <span style={{ marginLeft: '10px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                von {item.user_name}
                              </span>
                            )}
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
                            {canDelete && (
                              <button 
                                className="history-btn"
                                onClick={(e) => handleDeleteItem(item.id!, e)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="history-subject">{item.customer_name} - {item.customer_partner}</div>
                        <div className="history-preview">{getPreviewText(item.summary, 150)}</div>
                        <div className="history-item-settings">
                          <small>
                            {item.language} • {item.customer_email || item.customer_phone || 'Kein Kontakt'}
                          </small>
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

export default memo(HistoryTab);

