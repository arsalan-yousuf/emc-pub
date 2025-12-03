'use client';
import { Mic, History } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      <button 
        className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`}
        onClick={() => onTabChange('generator')}
      >
        <Mic className="h-6 w-6" style={{ color: activeTab === 'generator' ? '#2563eb' : 'inherit' }} />
        Summary Generator
      </button>
      <button 
        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <History className="h-6 w-6" style={{ color: activeTab === 'history' ? '#2563eb' : 'inherit' }} />
        History
      </button>
    </div>
  );
}

