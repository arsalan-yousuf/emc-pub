'use client';

import { useState, useEffect } from 'react';
import TabNavigation from './summaries/TabNavigation';
import GeneratorTab from './summaries/GeneratorTab';
import HistoryTab from './summaries/HistoryTab';
import SummaryDetailsModal from './summaries/SummaryDetailsModal';
import DeleteConfirmationModal from './summaries/DeleteConfirmationModal';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { SummaryWithUser } from '@/lib/summaries-db';
import { deleteSummary } from '@/lib/summaries-db';

export default function SummaryContainer() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isMounted, setIsMounted] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<Array<{id: string, type: 'success' | 'error' | 'warning' | 'info', message: string}>>([]);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<SummaryWithUser | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleOpenSummaryModal = (item: SummaryWithUser) => {
    setSelectedSummaryItem(item);
    setIsSummaryModalOpen(true);
  };

  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
    setSelectedSummaryItem(null);
  };

  const handleCopySummary = async (text: string, type: 'summary' | 'transcript', e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await navigator.clipboard.writeText(text);
      const message = type === 'summary' 
        ? 'Summary copied to clipboard!' 
        : 'Transcript copied to clipboard!';
      showToast('success', message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('error', 'Failed to copy to clipboard');
    }
  };

  const handleRequestDelete = (id: string) => {
    setSummaryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!summaryToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteSummary(summaryToDelete);
      if (result.success) {
        showToast('success', 'Summary deleted successfully');
        setHistoryRefreshTrigger(prev => prev + 1);
      } else {
        showToast('error', result.error || 'Failed to delete summary');
      }
    } catch (error) {
      console.error('Error deleting summary:', error);
      showToast('error', 'An error occurred while deleting the summary');
    } finally {
      setIsDeleting(false);
      setSummaryToDelete(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSummaryToDelete(null);
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
              onOpenSummaryModal={handleOpenSummaryModal}
              onRequestDelete={handleRequestDelete}
              isDeleting={isDeleting}
            />
          )}
        </div>
      </div>

      {/* Summary Details Modal */}
      <SummaryDetailsModal
        isOpen={isSummaryModalOpen}
        onClose={handleCloseSummaryModal}
        selectedItem={selectedSummaryItem}
        onCopySummary={handleCopySummary}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Summary"
        message="Are you sure you want to delete this summary? This action cannot be undone."
      />

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

