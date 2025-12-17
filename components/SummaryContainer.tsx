'use client';

import { useState, useEffect } from 'react';
import TabNavigation from './summaries/TabNavigation';
import GeneratorTab from './summaries/GeneratorTab';
import HistoryTab from './summaries/HistoryTab';
import ViewSummariesTab from './summaries/ViewSummariesTab';
import SummaryDetailsModal from './summaries/SummaryDetailsModal';
import DeleteConfirmationModal from './summaries/DeleteConfirmationModal';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { SummaryWithUser } from '@/lib/summaries-db';
import { deleteSummary } from '@/lib/summaries-db';
import { type UserRole } from '@/lib/user-roles';
import { getUserRoleServer } from '@/lib/user-roles-server';
import { createClient } from '@/lib/supabase/client';

interface SummaryContainerProps {
  initialRole?: UserRole | null;
}

export default function SummaryContainer({ initialRole = null }: SummaryContainerProps) {
  const [activeTab, setActiveTab] = useState('generator');
  const [isMounted, setIsMounted] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<Array<{id: string, type: 'success' | 'error' | 'warning' | 'info', message: string}>>([]);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<SummaryWithUser | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showViewSummaries, setShowViewSummaries] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(initialRole ?? null);
  
  // Initialize with the role passed from parent (server-side fetch)
  useEffect(() => {
    if (initialRole) {
      const hasAccess = initialRole === 'super_admin' || initialRole === 'admin' || initialRole === 'sales_support';
      setShowViewSummaries(hasAccess);
      setUserRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    setIsMounted(true);
    
    // Refetch role on client-side to update UI if role changed
    // This ensures UI stays in sync even if role was assigned/removed after page load
    const checkViewAccess = async () => {
      try {
        // Use server action instead of direct client call
        const role = await getUserRoleServer();

        // Show tab for super_admin, admin, or sales_support
        const hasAccess = role === 'super_admin' || role === 'admin' || role === 'sales_support';
        setShowViewSummaries(hasAccess);
        setUserRole(role);
      } catch (error) {
        console.error('Error checking view access:', error);
        // Don't override if we have initialRole
        if (!initialRole) {
          setShowViewSummaries(false);
        }
      }
    };
    
    // Refetch after a short delay to update if role changed
    const timeoutId = setTimeout(() => {
      checkViewAccess();
    }, 500);

    // Listen to auth state changes to re-check access when user logs in/out
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkViewAccess();
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [initialRole]);

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
        ? 'Zusammenfassung in die Zwischenablage kopiert!' 
        : 'Transkript in die Zwischenablage kopiert!';
      showToast('success', message);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('error', 'In die Zwischenablage kopieren fehlgeschlagen');
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
        showToast('success', 'Zusammenfassung erfolgreich gelöscht');
        setHistoryRefreshTrigger(prev => prev + 1);
      } else {
        showToast('error', result.error || 'Zusammenfassung konnte nicht gelöscht werden');
      }
    } catch (error) {
      console.error('Error deleting summary:', error);
      showToast('error', 'Beim Löschen der Zusammenfassung ist ein Fehler aufgetreten');
    } finally {
      setIsDeleting(false);
      setSummaryToDelete(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSummaryToDelete(null);
  };

  const canManageSummaries = userRole === 'admin' || userRole === 'super_admin';

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
        <h1>Call-Zusammenfassungs-Generator</h1>
        <p className="subtitle">Strukturierte Zusammenfassungen aus Sprachaufnahmen generieren</p>

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showViewSummaries={showViewSummaries}
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
              canDelete={canManageSummaries}
            />
          )}
          {activeTab === 'view-summaries' && showViewSummaries && (
            <ViewSummariesTab 
              showToast={showToast} 
              refreshTrigger={historyRefreshTrigger}
              onOpenSummaryModal={handleOpenSummaryModal}
              onRequestDelete={handleRequestDelete}
              isDeleting={isDeleting}
              canDelete={canManageSummaries}
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
        onSummaryUpdated={() => {
          setHistoryRefreshTrigger(prev => prev + 1);
          showToast('success', 'Zusammenfassung erfolgreich aktualisiert');
        }}
        canEdit={canManageSummaries}
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

