'use client';
import { Mail, History, FileText } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tab-navigation" id="mainTabNav">
      <button 
        className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`}
        onClick={() => onTabChange('generator')}
      >
        <Mail className="h-6 w-6 text-[#667eea]" />
        E-Mail Generator
      </button>
      <button 
        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <History className="h-6 w-6 text-[#667eea]" />
        Verlauf
      </button>
      <button 
        className={`tab-button expert-mode-only ${activeTab === 'templates' ? 'active' : ''}`}
        onClick={() => onTabChange('templates')}
      >
        <FileText className="h-6 w-6 text-[#667eea] inline-block" />
        Vorlagen
      </button>
    </div>
  );
}
