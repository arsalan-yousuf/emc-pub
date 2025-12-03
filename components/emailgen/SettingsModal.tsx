'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, X, Wrench } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onModeChange?: (isSimpleMode: boolean) => void;
  onSettingsSaved?: () => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
}

export default function SettingsModal({ isOpen, onClose, isAuthenticated, onModeChange, onSettingsSaved, onToggleTheme, isDarkMode }: SettingsModalProps) {
  const [apiProvider, setApiProvider] = useState('langdock');
  const [langDockModel, setLangDockModel] = useState('gpt-4.1');
  const [openAiModel, setOpenAiModel] = useState('gpt-4.1');
  const [isSimpleMode, setIsSimpleMode] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const savedProvider = localStorage.getItem('apiProvider') || 'langdock';
      const savedLangDockModel = localStorage.getItem('langDockModel') || 'gpt-4.1';
      const savedOpenAiModel = localStorage.getItem('openAiModel') || 'gpt-4.1';
      const savedSimpleMode = localStorage.getItem('simpleModeEnabled') || 'true';
      setApiProvider(savedProvider);
      setLangDockModel(savedLangDockModel);
      setOpenAiModel(savedOpenAiModel);
      setIsSimpleMode(savedSimpleMode === 'true');
    }
  }, [isOpen, isAuthenticated]);


  if (!isOpen || !isAuthenticated) return null;

  return (
    <div id="settingsModal" className="settings-modal">
      <div className="settings-modal-content">
        <div className="settings-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings className="h-5 w-5" />
            Administrator-Einstellungen
          </h3>
          <div className="settings-header-actions">
            <button className="theme-toggle-small" onClick={onToggleTheme}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="close-modal" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="settings-body" id="settingsContent">
          <div className="settings-container">
            {/* User Mode Settings */}
            <div className="settings-section" style={{ marginBottom: '40px' }}>
              <h3>🎯 Benutzer-Modus</h3>
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Wählen Sie zwischen dem vereinfachten Modus für schnelle E-Mails oder dem Expertenmodus mit allen Funktionen.
              </p>
              
              <div className="provider-grid">
                <div 
                  className={`provider-card ${!isSimpleMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsSimpleMode(false);
                    localStorage.setItem('simpleModeEnabled', 'false');
                    if (onModeChange) {
                      onModeChange(false);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="provider-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench className="h-4 w-4" />
                    Expertenmodus
                  </div>
                  <div className="provider-description">Vollzugriff auf alle Funktionen, Vorlagen, Historie</div>
                </div>
                <div 
                  className={`provider-card ${isSimpleMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsSimpleMode(true);
                    localStorage.setItem('simpleModeEnabled', 'true');
                    if (onModeChange) {
                      onModeChange(true);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="provider-name">🎯 Einfacher Modus</div>
                  <div className="provider-description">Vereinfachte Oberfläche, automatische Modellauswahl</div>
                </div>
              </div>
            </div>

            {/* API Provider Selection */}
            <div className="settings-section" style={{ marginBottom: '40px' }}>
              <h3>🤖 API-Provider Auswahl</h3>
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Wählen Sie Ihren bevorzugten KI-Provider aus.
              </p>
              
              <div className="provider-grid">
                <div 
                  className={`provider-card ${apiProvider === 'openai' ? 'active' : ''}`}
                  onClick={() => {
                    setApiProvider('openai');
                    localStorage.setItem('apiProvider', 'openai');
                    if (onSettingsSaved) {
                      onSettingsSaved();
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="provider-name">OpenAI</div>
                  <div className="provider-description">GPT-5, GPT-4.1, GPT-3.5 Turbo und weitere Modelle</div>
                </div>
                <div 
                  className={`provider-card ${apiProvider === 'langdock' ? 'active' : ''}`}
                  onClick={() => {
                    setApiProvider('langdock');
                    localStorage.setItem('apiProvider', 'langdock');
                    if (onSettingsSaved) {
                      onSettingsSaved();
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="provider-name">LangDock</div>
                  <div className="provider-description">GPT-4.1, GPT-4o, o3-mini, o1-preview und weitere Modelle</div>
                </div>
              </div>
            </div>
            

            <div className="form-group">
              <label htmlFor="model">KI-Modell:</label>
              <select
                id="model"
                value={ apiProvider === 'openai' ? openAiModel : langDockModel }
                onChange={(e) => {
                  if (apiProvider === 'openai') {
                    setOpenAiModel(e.target.value);
                    localStorage.setItem('openAiModel', e.target.value);
                  } else {
                    setLangDockModel(e.target.value);
                    localStorage.setItem('langDockModel', e.target.value);
                  }
                  if (onSettingsSaved) {
                    onSettingsSaved();
                  }
                }}
              >
                {apiProvider === 'openai' ? (
                  <>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o-nano">GPT-4o Nano</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="o1-preview">o1-preview</option>
                    <option value="o1-mini">o1-mini</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="o3-mini">o3-mini</option>
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                    <option value="claude-3-7-sonnet-20250219">Claude Sonnet 3.7</option>
                    <option value="claude-3-5-sonnet-20240620">Claude Sonnet 3.5</option>
                  </>
                )}
              </select>
            </div>

          </div>


        </div>
      </div>
    </div>
  );
}
