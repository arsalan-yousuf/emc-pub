'use client';

import { useState, useEffect } from 'react';
import Header from './emailgen/Header';
import TabNavigation from './emailgen/TabNavigation';
import GeneratorTab from './emailgen/GeneratorTab';
import HistoryTab from './emailgen/HistoryTab';
import TemplatesTab from './emailgen/TemplatesTab';
import LoginModal from './emailgen/LoginModal';
import SettingsModal from './emailgen/SettingsModal';
import { Target, Settings, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function EmailGenContainer() {
  const [activeTab, setActiveTab] = useState('generator');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(true); // Default to simple mode for SSR
  const [isMounted, setIsMounted] = useState(false);
  const [toasts, setToasts] = useState<Array<{id: string, type: 'success' | 'error' | 'warning' | 'info', message: string}>>([]);

  const updateMainInterface = (isSimple: boolean) => {
    // Add/remove CSS classes on body for styling
    if (isSimple) {
      document.body.classList.add('simple-mode');
      document.body.classList.remove('expert-mode');
    } else {
      document.body.classList.remove('simple-mode');
      document.body.classList.add('expert-mode');
    }
  };

  // Load settings from localStorage after hydration
  useEffect(() => {
    setIsMounted(true);
    
    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
    
    // Load simple mode setting
    const savedSimpleMode = localStorage.getItem('simpleModeEnabled');
    if (savedSimpleMode !== null) {
      const isSimple = savedSimpleMode === 'true';
      setIsSimpleMode(isSimple);
      updateMainInterface(isSimple);
    } else {
      // For new users, default to simple mode and save to localStorage
      setIsSimpleMode(true);
      updateMainInterface(true);
      localStorage.setItem('simpleModeEnabled', 'true');
    }
  }, []);

  // Apply mode styling when isSimpleMode changes
  useEffect(() => {
    updateMainInterface(isSimpleMode);
  }, [isSimpleMode]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const switchTab = (tabName: string) => {
    setActiveTab(tabName);
  };

  const openSettingsLogin = () => {
    setIsLoginModalOpen(true);
  };

  const closeSettingsLogin = () => {
    setIsLoginModalOpen(false);
  };

  const openSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    setIsSettingsModalOpen(true);
  };

  const handleModeChange = (newIsSimpleMode: boolean) => {
    setIsSimpleMode(newIsSimpleMode);
    updateMainInterface(newIsSimpleMode);
    
    // If switching to simple mode and currently on expert-only tab, switch to generator
    if (newIsSimpleMode && (activeTab === 'history' || activeTab === 'templates')) {
      setActiveTab('generator');
    }
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSettingsSaved = () => {
    // Trigger a refresh of the GeneratorTab to update API provider info
    setRefreshTrigger(prev => prev + 1);
  };

  // Toast notification functions
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

  // Prevent hydration mismatch by not rendering until mounted
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
      <Header
        onSettingsClick={openSettingsLogin}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <div className="main-container">
        <h1>B2B E-Mail Generator</h1>
        <p className="subtitle">Professionelle Geschäftskommunikation mit KI-Unterstützung</p>

        {/* Modus-Anzeige (nur Information, Umschaltung in Einstellungen) */}
        {!isSimpleMode && <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <div id="modeIndicator" style={{background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: '12px', padding: '15px', display: 'inline-block'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center'}}>
              <span id="currentModeText" style={{fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'}}>
                {isSimpleMode ? (
                  <>
                    <Target className="h-4 w-4" />
                    Einfacher Modus aktiv
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    Expertenmodus aktiv
                  </>
                )}
              </span>
              <small style={{color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                Ändern Sie den Modus in den <Settings className="h-3 w-3" /> Einstellungen
              </small>
            </div>
          </div>
        </div>}


        <TabNavigation
          activeTab={activeTab}
          onTabChange={switchTab}
        />

        <div className="tab-content-container">
          {activeTab === 'generator' && <GeneratorTab isSimpleMode={isSimpleMode} refreshTrigger={refreshTrigger} showToast={showToast} />}
          {activeTab === 'history' && <HistoryTab showToast={showToast} />}
          {activeTab === 'templates' && <TemplatesTab showToast={showToast} />}
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeSettingsLogin}
        onLoginSuccess={handleLoginSuccess}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        isAuthenticated={isAuthenticated}
        onModeChange={handleModeChange}
        onSettingsSaved={handleSettingsSaved}
        onToggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
      />

      {/* Toast Notifications - At the very top level for proper fixed positioning */}
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
