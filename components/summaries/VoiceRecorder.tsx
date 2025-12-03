'use client';

import { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '@/lib/transcribe';
import { Mic, Square, X } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  language: 'german' | 'english';
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export default function VoiceRecorder({ 
  onTranscription, 
  language, 
  disabled = false,
  onRecordingStateChange 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
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
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStateChange?.(false);
      
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
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      const langCode = language === 'german' ? 'de' : 'en';
      const transcript = await transcribeAudio(audioFile, langCode);
      
      if (transcript && transcript.trim()) {
        onTranscription(transcript.trim());
      } else {
        setError('No speech detected');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Transcription failed');
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
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isProcessing}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: 'none',
            background: isRecording 
              ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'
              : isProcessing
              ? 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            color: 'white',
            cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            boxShadow: isRecording 
              ? '0 4px 20px rgba(255, 107, 107, 0.4)'
              : '0 4px 20px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.3s ease',
            opacity: disabled || isProcessing ? 0.6 : 1,
            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
          }}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isProcessing ? (
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          ) : isRecording ? (
            <Square style={{ width: '40px', height: '40px' }} />
          ) : (
            <Mic style={{ width: '48px', height: '48px' }} />
          )}
        </button>
        
        {isRecording && (
          <button
            type="button"
            onClick={cancelRecording}
            style={{
              background: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(255, 71, 87, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff3742';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 71, 87, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ff4757';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 71, 87, 0.3)';
            }}
            title="Cancel Recording"
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
        )}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        {isRecording && (
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#ff6b6b', marginBottom: '8px' }}>
            Recording: {formatDuration(recordingDuration)}
          </div>
        )}
        {isProcessing && (
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#ffa726' }}>
            Processing...
          </div>
        )}
        {error && (
          <div style={{ fontSize: '14px', color: '#ff4757', marginTop: '8px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

