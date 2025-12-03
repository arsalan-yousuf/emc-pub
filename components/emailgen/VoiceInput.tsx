'use client';

import { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '@/lib/transcribe';
import { Mic, X, Square } from 'lucide-react';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export default function VoiceInput({ onTranscription, placeholder = "Voice input", disabled = false, onRecordingStateChange }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      onRecordingStateChange?.(true);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      showError('Mikrofon-Zugriff verweigert oder nicht verfügbar');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      onRecordingStateChange?.(false);
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear the onstop handler to prevent processing
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      onRecordingStateChange?.(false);
      audioChunksRef.current = []; // Clear the audio chunks
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      cleanup(); // Clean up the stream
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Convert Blob to File for the server action
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      
      const transcript = await transcribeAudio(audioFile);
      
      if (transcript && transcript.trim()) {
        onTranscription(transcript.trim());
      } else {
        showError('Keine Sprache erkannt');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      showError(err instanceof Error ? err.message : 'Spracherkennung fehlgeschlagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const showError = (message: string) => {
    setError(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, 5000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isProcessing) return 'Verarbeitung...';
    if (isRecording) return `Aufnahme: ${formatDuration(recordingDuration)}`;
    if (error) return 'Fehler';
    return '';
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="voice-input-container">
      <div className="voice-status">
        <div className={`status-text ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
          {getStatusText()}
        </div>
      </div>
      <div className="voice-controls">
        <div className="voice-button-container">
          <button
            type="button"
            className={`voice-input-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleClick}
            disabled={disabled || isProcessing}
            title={isRecording ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
          >
            {isProcessing ? (
              <div className="processing-spinner"></div>
            ) : isRecording ? (
              <div className="recording-pulse">
                <Square className="h-5 w-5 text-white" />
              </div>
            ) : (
              <Mic className="h-5 w-5 text-white" />
            )}
          </button>
          
          {isRecording && (
            <div className="recording-radiation">
              <div className="radiation-ring ring-1"></div>
              <div className="radiation-ring ring-2"></div>
              {/* <div className="radiation-ring ring-3"></div> */}
              {/* <div className="radiation-ring ring-4"></div> */}
            </div>
          )}
        </div>
        
        {isRecording && (
          <button
            type="button"
            className="voice-cancel-btn"
            onClick={cancelRecording}
            title="Aufnahme abbrechen"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}
    </div>
  );
}
