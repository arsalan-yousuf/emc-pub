'use client';

import { useState, useEffect } from 'react';
import TabNavigation from './summaries/TabNavigation';
import GeneratorTab from './summaries/GeneratorTab';
import HistoryTab from './summaries/HistoryTab';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function SummaryContainer() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isMounted, setIsMounted] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<Array<{id: string, type: 'success' | 'error' | 'warning' | 'info', message: string}>>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, duration: number = 3000) => {
    const id = Date.now().toString();
    const newToast = { id, type, message };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  if (!isMounted) {
    return (
      <div className="main-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-container">
        <h1>Call Summary Generator</h1>
        <p className="subtitle">Generate structured summaries from voice recordings</p>

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="tab-content-container">
          {activeTab === 'generator' && (
            <GeneratorTab 
              showToast={showToast} 
              onSummarySaved={() => setHistoryRefreshTrigger(prev => prev + 1)}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab 
              showToast={showToast} 
              refreshTrigger={historyRefreshTrigger}
            />
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-notification toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            <span>
              {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {toast.type === 'error' && <XCircle className="h-4 w-4" />}
              {toast.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {toast.type === 'info' && <Info className="h-4 w-4" />}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

