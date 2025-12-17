'use client';
import { Mic, History, Eye } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showViewSummaries?: boolean;
}

export default function TabNavigation({ activeTab, onTabChange, showViewSummaries = false }: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      <button 
        className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`}
        onClick={() => onTabChange('generator')}
      >
        <Mic className="h-6 w-6" style={{ color: activeTab === 'generator' ? '#2563eb' : 'inherit' }} />
        Zusammenfassung generieren
      </button>
      <button 
        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <History className="h-6 w-6" style={{ color: activeTab === 'history' ? '#2563eb' : 'inherit' }} />
        Verlauf
      </button>
      {showViewSummaries && (
        <button 
          className={`tab-button ${activeTab === 'view-summaries' ? 'active' : ''}`}
          onClick={() => onTabChange('view-summaries')}
        >
          <Eye className="h-6 w-6" style={{ color: activeTab === 'view-summaries' ? '#2563eb' : 'inherit' }} />
          Zusammenfassungen anzeigen
        </button>
      )}
    </div>
  );
}

