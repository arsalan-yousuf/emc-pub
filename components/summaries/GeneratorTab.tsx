'use client';

import { useState, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { generateSummary } from '@/lib/summary-generator';
import { saveSummary } from '@/lib/summaries-db';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Info, Edit2, Save, X } from 'lucide-react';

interface GeneratorTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
  onSummarySaved?: () => void;
}

export default function GeneratorTab({ showToast, onSummarySaved }: GeneratorTabProps) {
  const [language, setLanguage] = useState<'german' | 'english'>('german');
  const [customerName, setCustomerName] = useState('');
  const [customerPartner, setCustomerPartner] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<'langdock'>('langdock');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1');

  // Load user and settings
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    const loadSettings = () => {
      const savedModel = localStorage.getItem('langDockModel') || 'gpt-4.1';
      setSelectedModel(savedModel);
    };

    loadUser();
    loadSettings();
  }, []);

  const handleTranscription = (text: string) => {
    setTranscript(prev => {
      if (prev.trim()) {
        return prev + ' ' + text;
      }
      return text;
    });
  };

  const handleGenerateSummary = async () => {
    if (!transcript.trim()) {
      showToast?.('error', 'Bitte geben Sie ein Transkript an');
      return;
    }

    if (!customerName.trim()) {
      showToast?.('error', 'Bitte geben Sie den Kundennamen an');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateSummary({
        transcript,
        language,
        apiProvider,
        selectedModel,
        customer_name: customerName,
        interlocutor: customerPartner
      });

      if (result.success && result.content) {
        setSummary(result.content);
        setEditedSummary(result.content);
        setIsEditingSummary(false);
        showToast?.('success', 'Zusammenfassung erfolgreich generiert!');
      } else {
        showToast?.('error', result.error || 'Zusammenfassung konnte nicht generiert werden');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      showToast?.('error', 'Beim Generieren der Zusammenfassung ist ein Fehler aufgetreten');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSummary = () => {
    setEditedSummary(summary);
    setIsEditingSummary(true);
  };

  const handleCancelEdit = () => {
    setEditedSummary(summary);
    setIsEditingSummary(false);
  };

  const handleSaveEdit = () => {
    setSummary(editedSummary);
    setIsEditingSummary(false);
    showToast?.('success', 'Zusammenfassung aktualisiert!');
  };

  const handleSaveSummary = async () => {
    const summaryToSave = isEditingSummary ? editedSummary : summary;
    
    if (!summaryToSave.trim()) {
      showToast?.('error', 'Keine Zusammenfassung zum Speichern');
      return;
    }

    if (!userId) {
      showToast?.('error', 'Benutzer nicht authentifiziert');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveSummary({
        user_id: userId,
        customer_name: customerName,
        customer_partner: customerPartner || undefined,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        transcript,
        summary: summaryToSave,
        language
      });

      if (result.success) {
        showToast?.('success', 'Zusammenfassung erfolgreich gespeichert!');
        // Reset form
        setTranscript('');
        setSummary('');
        setEditedSummary('');
        setIsEditingSummary(false);
        setCustomerName('');
        setCustomerPartner('');
        setCustomerEmail('');
        setCustomerPhone('');
        // Trigger history refresh
        onSummarySaved?.();
      } else {
        showToast?.('error', result.error || 'Zusammenfassung konnte nicht gespeichert werden');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
      showToast?.('error', 'Beim Speichern der Zusammenfassung ist ein Fehler aufgetreten');
    } finally {
      setIsSaving(false);
    }
  };

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
            <option value="german">Deutsch</option>
            <option value="english">Englisch</option>
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
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
                value={customerPartner}
                onChange={(e) => setCustomerPartner(e.target.value)}
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
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
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
            disabled={
              isGenerating ||
              isSaving ||
              !customerName.trim() ||
              !customerPartner.trim()
            }
            onRecordingStateChange={setIsRecording}
          />
          {(!customerName.trim() || !customerPartner.trim()) && (
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
              disabled={isGenerating || !transcript.trim() || !customerName.trim()}
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.2em',
                fontWeight: '600',
                cursor: isGenerating || !transcript.trim() || !customerName.trim() ? 'not-allowed' : 'pointer',
                opacity: isGenerating || !transcript.trim() || !customerName.trim() ? 0.6 : 1,
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
                        onClick={() => {
                          navigator.clipboard.writeText(summary);
                          showToast?.('success', 'Zusammenfassung in die Zwischenablage kopiert!');
                        }}
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

