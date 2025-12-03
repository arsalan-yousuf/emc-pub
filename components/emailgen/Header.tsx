'use client';

import { Settings } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function Header({ onSettingsClick, isDarkMode, onToggleTheme }: HeaderProps) {
  return (
    <button 
      className="theme-toggle" 
      onClick={onSettingsClick}
    >
      <Settings className="h-4 w-4" />
      <span>Einstellungen</span>
    </button>
  );
}
