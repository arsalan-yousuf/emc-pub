'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const storedPassword = localStorage.getItem('adminPassword') || 'admin';
    if (password === storedPassword) {
      onLoginSuccess();
    } else {
      setError('Falsches Passwort. Bitte versuchen Sie es erneut.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (!isOpen) return null;

  return (
    <div id="loginModal" className="login-modal">
      <div className="login-modal-content">
        <div className="login-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock className="h-5 w-5" />
            Einstellungen
          </h3>
          <button className="close-modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="login-body">
          <p>Bitte geben Sie das Administrator-Passwort ein:</p>
          <div className="login-input-wrapper">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Passwort eingeben..." 
              className="login-input" 
            />
            <button className="login-btn" onClick={handleLogin}>Anmelden</button>
          </div>
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
          <div className="login-info">
            <small>Hinweis: Das Standard-Passwort ist "admin". Sie können es in den Einstellungen ändern.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
