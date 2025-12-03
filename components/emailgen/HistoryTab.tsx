'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Copy, Trash2, X, Inbox } from 'lucide-react';

interface HistoryItem {
  id: number;
  timestamp: string;
  originalEmail: string;
  generatedEmail: string;
  subject?: string;
  rating?: number;
  settings: {
    language: string;
    occasion: string;
    intention: string;
    tone: string;
    customTone: string;
    template: string;
    customInstructions: string;
  };
}

interface HistoryTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
}

function HistoryTab({ showToast }: HistoryTabProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const savedHistory = JSON.parse(localStorage.getItem('emailHistory') || '[]');
        setHistory(savedHistory);
      } catch (error) {
        console.error('Error loading history:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure smooth transition
    const timer = setTimeout(loadHistory, 100);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort history based on selected filters with memoization
  const filteredHistory = useMemo(() => {
    let filtered = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      const now = new Date();
      
      // Time-based filtering
      let timeMatch = true;
      switch (filter) {
        case 'today':
          timeMatch = itemDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          timeMatch = itemDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          timeMatch = itemDate >= monthAgo;
          break;
        default:
          timeMatch = true;
      }

      // Rating-based filtering
      let ratingMatch = true;
      if (ratingFilter !== 'all') {
        const itemRating = item.rating || 0;
        if (ratingFilter === '0') {
          ratingMatch = itemRating === 0;
        } else {
          const minRating = parseInt(ratingFilter);
          ratingMatch = itemRating >= minRating;
        }
      }

      // Search filtering
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        searchMatch = 
          (item.subject || '').toLowerCase().includes(query) ||
          item.generatedEmail.toLowerCase().includes(query) ||
          item.originalEmail.toLowerCase().includes(query) ||
          item.settings.occasion.toLowerCase().includes(query) ||
          item.settings.tone.toLowerCase().includes(query) ||
          item.settings.language.toLowerCase().includes(query);
      }

      return timeMatch && ratingMatch && searchMatch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [history, filter, ratingFilter, searchQuery, sortOrder]);

  const handleDeleteItem = (id: number) => {
    if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('emailHistory', JSON.stringify(updatedHistory));
      
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    showToast?.('success', 'E-Mail in die Zwischenablage kopiert!');
  };

  const renderStars = (rating: number = 0) => {
    const safe = Math.max(0, Math.min(5, Math.floor(rating)));
    return '★'.repeat(safe) + '☆'.repeat(5 - safe);
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

  const getPreviewText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div id="historyTab" className="tab-content active">
      <div className="history-container">
        {isLoading ? (
          <div className="history-loading">
            <div className="loading-spinner"></div>
            <p>Lade Verlauf...</p>
          </div>
        ) : (
          <>
            <div className="history-search">
              <input 
                type="text" 
                id="searchInput" 
                placeholder="Suchen Sie nach Betreff, Inhalt oder Anlass..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '16px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </div>
        
            <div className="history-filters" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <select 
                  id="ratingFilter" 
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="all">Alle Bewertungen</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 Sterne)</option>
                  <option value="4">⭐⭐⭐⭐ (4+ Sterne)</option>
                  <option value="3">⭐⭐⭐ (3+ Sterne)</option>
                  <option value="2">⭐⭐ (2+ Sterne)</option>
                  <option value="1">⭐ (1+ Stern)</option>
                  <option value="0">Unbewertet</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <select 
                  id="sortOrder" 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="date-desc">Neueste zuerst</option>
                  <option value="date-asc">Älteste zuerst</option>
                  <option value="rating-desc">Beste Bewertung</option>
                  <option value="rating-asc">Schlechteste Bewertung</option>
                </select>
              </div>
            </div>
        
            <div className="history-content">
              <div className="history-list">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Inbox className="h-12 w-12 text-gray-400" />
                    </div>
                    <p>Noch keine E-Mails generiert</p>
                    <small>Ihre generierten E-Mails werden hier angezeigt</small>
                  </div>
                ) : (
                  <div className="history-items">
                    {filteredHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className={`history-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="history-header">
                          <div className="history-meta">
                            {formatDate(item.timestamp)}
                          </div>
                          <div className="star-rating">{renderStars(item.rating || 0)}</div>
                          <div className="history-item-actions">
                            <button 
                              className="history-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyEmail(item.generatedEmail);
                              }}
                              title="Kopieren"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button 
                              className="history-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="history-subject">{item.subject || '(Ohne Betreff)'}</div>
                        <div className="history-preview">{getPreviewText(item.generatedEmail, 150)}</div>
                        <div className="history-item-settings">
                          <small>
                            {item.settings.language} • {item.settings.occasion} • {item.settings.tone}
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
                    <h3>E-Mail Details</h3>
                    <button 
                      className="close-detail"
                      onClick={() => setSelectedItem(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="history-detail-content">
                    <div className="detail-section">
                      <h4>Original E-Mail:</h4>
                      <div className="email-content">
                        <pre>{selectedItem.originalEmail}</pre>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>Generierte Antwort:</h4>
                      <div className="email-content">
                        <pre>{selectedItem.generatedEmail}</pre>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>Einstellungen:</h4>
                      <div className="settings-info">
                        <p><strong>Sprache:</strong> {selectedItem.settings.language}</p>
                        <p><strong>Anlass:</strong> {selectedItem.settings.occasion}</p>
                        <p><strong>Intention:</strong> {selectedItem.settings.intention}</p>
                        <p><strong>Ton:</strong> {selectedItem.settings.tone}</p>
                        {selectedItem.settings.customTone && (
                          <p><strong>Eigener Ton:</strong> {selectedItem.settings.customTone}</p>
                        )}
                        {selectedItem.settings.customInstructions && (
                          <p><strong>Zusätzliche Anweisungen:</strong> {selectedItem.settings.customInstructions}</p>
                        )}
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button 
                        className="action-button"
                        onClick={() => handleCopyEmail(selectedItem.generatedEmail)}
                      >
                        <Copy className="h-4 w-4" />
                        Antwort kopieren
                      </button>
                      <button 
                        className="action-button"
                        onClick={() => handleCopyEmail(selectedItem.originalEmail)}
                      >
                        <Copy className="h-4 w-4" />
                        Original kopieren
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
