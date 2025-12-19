'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { generateSummary } from '@/lib/summary-generator';
import { saveSummary } from '@/lib/summaries-db';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Save, X } from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface GeneratorTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
  onSummarySaved?: () => void;
}

interface CustomerInfo {
  name: string;
  partner: string;
  email: string;
  phone: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4.1';
const STORAGE_KEY_MODEL = 'langDockModel';

const ERROR_MESSAGES = {
  NO_TRANSCRIPT: 'Bitte geben Sie ein Transkript an',
  NO_CUSTOMER_NAME: 'Bitte geben Sie den Kundennamen an',
  NO_SUMMARY: 'Keine Zusammenfassung zum Speichern',
  NOT_AUTHENTICATED: 'Benutzer nicht authentifiziert',
  GENERATION_FAILED: 'Beim Generieren der Zusammenfassung ist ein Fehler aufgetreten',
  SAVE_FAILED: 'Beim Speichern der Zusammenfassung ist ein Fehler aufgetreten',
} as const;

const SUCCESS_MESSAGES = {
  GENERATED: 'Zusammenfassung erfolgreich generiert!',
  UPDATED: 'Zusammenfassung aktualisiert!',
  SAVED: 'Zusammenfassung erfolgreich gespeichert!',
  COPIED: 'Zusammenfassung in die Zwischenablage kopiert!',
} as const;

// ============================================================================
// Component
// ============================================================================

export default function GeneratorTab({ showToast, onSummarySaved }: GeneratorTabProps) {
  // State
  const [language, setLanguage] = useState<'german' | 'english'>('german');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    partner: '',
    email: '',
    phone: '',
  });
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [apiProvider] = useState<'langdock'>('langdock');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
      }
    };

    const loadSettings = () => {
      const savedModel = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
      setSelectedModel(savedModel);
    };

    loadUser();
    loadSettings();
  }, []);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateGeneration = useCallback((): boolean => {
    if (!transcript.trim()) {
      showToast?.('error', ERROR_MESSAGES.NO_TRANSCRIPT);
      return false;
    }

    if (!customerInfo.name.trim()) {
      showToast?.('error', ERROR_MESSAGES.NO_CUSTOMER_NAME);
      return false;
    }

    return true;
  }, [transcript, customerInfo.name, showToast]);

  const validateSave = useCallback((summaryToSave: string, currentUserId: string | null): boolean => {
    if (!summaryToSave.trim()) {
      showToast?.('error', ERROR_MESSAGES.NO_SUMMARY);
      return false;
    }

    if (!currentUserId) {
      showToast?.('error', ERROR_MESSAGES.NOT_AUTHENTICATED);
      return false;
    }

    return true;
  }, [showToast]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleTranscription = useCallback((text: string) => {
    setTranscript(prev => (prev.trim() ? `${prev} ${text}` : text));
  }, []);

  const updateCustomerInfo = useCallback(<K extends keyof CustomerInfo>(
    field: K,
    value: CustomerInfo[K]
  ) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setTranscript('');
    setSummary('');
    setEditedSummary('');
    setIsEditingSummary(false);
    setCustomerInfo({ name: '', partner: '', email: '', phone: '' });
  }, []);

  const handleGenerateSummary = useCallback(async () => {
    if (!validateGeneration()) return;

    setIsGenerating(true);
    try {
      const result = await generateSummary({
        transcript,
        language,
        apiProvider,
        selectedModel,
        customer_name: customerInfo.name,
        interlocutor: customerInfo.partner,
      });

      if (result.success && result.content) {
        setSummary(result.content);
        setEditedSummary(result.content);
        setIsEditingSummary(false);
        showToast?.('success', SUCCESS_MESSAGES.GENERATED);
      } else {
        showToast?.('error', result.error || 'Zusammenfassung konnte nicht generiert werden');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      showToast?.('error', ERROR_MESSAGES.GENERATION_FAILED);
    } finally {
      setIsGenerating(false);
    }
  }, [transcript, language, apiProvider, selectedModel, customerInfo, validateGeneration, showToast]);

  const handleEditSummary = useCallback(() => {
    setEditedSummary(summary);
    setIsEditingSummary(true);
  }, [summary]);

  const handleCancelEdit = useCallback(() => {
    setEditedSummary(summary);
    setIsEditingSummary(false);
  }, [summary]);

  const handleSaveEdit = useCallback(() => {
    setSummary(editedSummary);
    setIsEditingSummary(false);
    showToast?.('success', SUCCESS_MESSAGES.UPDATED);
  }, [editedSummary, showToast]);

  const handleSaveSummary = useCallback(async () => {
    const summaryToSave = isEditingSummary ? editedSummary : summary;

    // Fetch user directly if userId is not available (handles race condition)
    let currentUserId = userId;
    if (!currentUserId) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentUserId = user.id;
          setUserId(user.id); // Update state for future use
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    if (!validateSave(summaryToSave, currentUserId)) return;

    setIsSaving(true);
    try {
      const result = await saveSummary({
        user_id: currentUserId!,
        customer_name: customerInfo.name,
        customer_partner: customerInfo.partner || undefined,
        customer_email: customerInfo.email || undefined,
        customer_phone: customerInfo.phone || undefined,
        transcript,
        summary: summaryToSave,
        language,
      });

      if (result.success) {
        showToast?.('success', SUCCESS_MESSAGES.SAVED);
        resetForm();
        onSummarySaved?.();
      } else {
        showToast?.('error', result.error || 'Zusammenfassung konnte nicht gespeichert werden');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
      showToast?.('error', ERROR_MESSAGES.SAVE_FAILED);
    } finally {
      setIsSaving(false);
    }
  }, [isEditingSummary, editedSummary, summary, userId, customerInfo, transcript, language, validateSave, resetForm, showToast, onSummarySaved]);

  const handleCopySummary = useCallback(() => {
    navigator.clipboard.writeText(summary);
    showToast?.('success', SUCCESS_MESSAGES.COPIED);
  }, [summary, showToast]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isRecordingDisabled = useMemo(
    () => isGenerating || isSaving || !customerInfo.name.trim() || !customerInfo.partner.trim(),
    [isGenerating, isSaving, customerInfo.name, customerInfo.partner]
  );

  const canGenerate = useMemo(
    () => !isGenerating && transcript.trim() && customerInfo.name.trim(),
    [isGenerating, transcript, customerInfo.name]
  );

  return (
    <div className="tab-content active">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Language Selection */}
        <div className="input-section">
          <label htmlFor="summaryLanguage" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Aufnahmesprache:
          </label>
          <select
            id="summaryLanguage"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'german' | 'english')}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              fontSize: '16px',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            disabled={isRecording}
          >
            <option value="german">🇩🇪 Deutsch</option>
            <option value="english">🇬🇧 Englisch</option>
          </select>
        </div>

        {/* Customer Information */}
        <div className="input-section">
          <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Kundeninformationen</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label htmlFor="customerName" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
               Kundenname *
              </label>
              <input
                id="customerName"
                type="text"
                value={customerInfo.name}
                onChange={(e) => updateCustomerInfo('name', e.target.value)}
                placeholder="John Doe"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label htmlFor="customerPartner" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Gesprächspartner *
              </label>
              <input
                id="customerPartner"
                type="text"
                value={customerInfo.partner}
                onChange={(e) => updateCustomerInfo('partner', e.target.value)}
                placeholder="Jane Doe"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label htmlFor="customerEmail" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                E-Mail
              </label>
              <input
                id="customerEmail"
                type="email"
                value={customerInfo.email}
                onChange={(e) => updateCustomerInfo('email', e.target.value)}
                placeholder="john.doe@example.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label htmlFor="customerPhone" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Telefon
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => updateCustomerInfo('phone', e.target.value)}
                placeholder="+1234567890"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Recording Guidelines */}
        <div className="input-section">
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
            Aufnahmerichtlinien:
          </label>
          <div
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '15px',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              lineHeight: '1.6'
            }}
          >
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              listStyleType: 'disc'
            }}>
              <li style={{ marginBottom: '8px' }}>Direkt nach dem Gespräch erfassen (spätestens nach 10–15 Min.), sonst erst roh Stichpunkte notieren.</li>
              <li style={{ marginBottom: '8px' }}>Nur Fakten, keine Vermutungen: Wenn etwas fehlt → „offen / nicht erwähnt“ statt raten.</li>
              <li style={{ marginBottom: '8px' }}>Kundenbedarf klar formulieren: „Kunde braucht X, weil Y.“</li>
              <li style={{ marginBottom: '8px' }}>Situation/Problem konkret: Ursache + Auswirkung (nicht nur „läuft schlecht“).</li>
              <li style={{ marginBottom: '8px' }}>Entscheidungen markieren: „Entschieden:“ / „Nicht entschieden:</li>
              <li style={{ marginBottom: '8px' }}>To-dos immer komplett: Owner + Termin (oder „Termin offen + Trigger“).</li>
              <li style={{ marginBottom: '8px' }}>Produkte/Lösungen nur nennen, wenn wirklich besprochen (mit Bezug wofür).</li>
              <li style={{ marginBottom: '8px' }}>Daten immer absolut (TT.MM.JJJJ) + nächster Kontakt (Datum + Zweck).</li>
              <li style={{ marginBottom: '0' }}>30-Sekunden Check: Sind Bedarf, Entscheidung, To-dos, Deadline drin? Alles Unklare als „offen“ markiert?</li>
            </ul>
          </div>
        </div>

        {/* Voice Recorder */}
        <div className="input-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>Sprachnotiz aufnehmen</h3>
          <VoiceRecorder
            onTranscription={handleTranscription}
            language={language}
            disabled={isRecordingDisabled}
            onRecordingStateChange={setIsRecording}
          />
          {(!customerInfo.name.trim() || !customerInfo.partner.trim()) && (
            <p
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--muted-foreground)',
                textAlign: 'center'
              }}
            >
              Bitte geben Sie zuerst <strong>Kundenname</strong> und <strong>Gesprächspartner</strong> ein, um die Aufnahme zu starten.
            </p>
          )}
        </div>

        {/* Transcript Textarea */}
        {transcript && (
          <div className="input-section">
            <label htmlFor="transcript" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Transkript (bearbeitbar):
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Transkript erscheint hier nach der Aufnahme..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        {/* Submit Button */}
        {transcript && (
          <div className="input-section">
            <button
              onClick={handleGenerateSummary}
              disabled={!canGenerate}
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.2em',
                fontWeight: '600',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                opacity: canGenerate ? 1 : 0.6,
                transition: 'all 0.3s ease'
              }}
            >
              {isGenerating ? (
                <>
                  <span className="loading" style={{ marginRight: '8px' }}></span>
                  Zusammenfassung wird generiert...
                </>
              ) : (
                'Zusammenfassung generieren'
              )}
            </button>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="output-section" style={{ display: 'block' }}>
            <div className="response-box">
              <div className="response-header">
                <div>
                  <div className="response-title">Generierte Zusammenfassung</div>
                </div>
                <div>
                  {!isEditingSummary ? (
                    <>
                      <button
                        className="copy-button"
                        onClick={handleCopySummary}
                      >
                        Kopieren
                      </button>
                      <button
                        onClick={handleEditSummary}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          color: 'var(--text-primary)',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Edit2 style={{ width: '14px', height: '14px' }} />
                        Bearbeiten
                      </button>
                      <button
                        onClick={handleSaveSummary}
                        disabled={isSaving}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          fontSize: '0.9em',
                          color: 'var(--text-primary)',
                          marginLeft: '8px',
                          opacity: isSaving ? 0.6 : 1
                        }}
                      >
                        {isSaving ? 'Wird gespeichert...' : 'Zusammenfassung speichern'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          color: 'white',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Save style={{ width: '14px', height: '14px' }} />
                        Änderungen speichern
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          color: 'var(--text-primary)',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <X style={{ width: '14px', height: '14px' }} />
                        Abbrechen
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="response-text">
                {isEditingSummary ? (
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '12px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '15px',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word'
                    }}
                  />
                ) : (
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word',
                    fontFamily: 'inherit',
                    margin: 0
                  }}>{summary}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

