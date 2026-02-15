'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';

interface VoiceRecorderResult {
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  duration: number;
  transcript: string;
}

interface VoiceRecorderProps {
  onResult: (result: VoiceRecorderResult) => void;
  className?: string;
}

export function VoiceRecorder({ onResult, className }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setRecording(false);
    setProcessing(true);

    // Wait for final data
    const blob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunksRef.current, { type: mediaRecorder.mimeType }));
      };
      mediaRecorder.stop();
    });

    // Preview URL
    const previewUrl = URL.createObjectURL(blob);
    setAudioUrl(previewUrl);

    try {
      // Upload audio file
      setProcessingStep('Uploading audio...');
      const uploadForm = new FormData();
      uploadForm.append('file', blob, 'recording.webm');

      const uploadRes = await authFetch('/api/uploads', {
        method: 'POST',
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || 'Upload failed');
      }

      const uploadResult = await uploadRes.json();

      // Transcribe
      setProcessingStep('Transcribing...');
      const transcribeForm = new FormData();
      transcribeForm.append('audio', blob, 'recording.webm');

      const transcribeRes = await authFetch('/api/voice/transcribe', {
        method: 'POST',
        body: transcribeForm,
      });

      let transcript = '';
      if (transcribeRes.ok) {
        const transcribeResult = await transcribeRes.json();
        transcript = transcribeResult.text || '';
      } else {
        console.warn('Transcription failed, saving audio without transcript');
      }

      onResult({
        fileUrl: uploadResult.url,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.size,
        duration,
        transcript,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  }, [onResult]);

  const discard = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setElapsed(0);
    setError(null);
  }, [audioUrl]);

  return (
    <div className={className}>
      <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
        {/* Recording controls */}
        <div className="flex flex-col items-center gap-4">
          {!recording && !processing && !audioUrl && (
            <>
              <button
                type="button"
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              <p className="text-sm text-slate-400">Tap to start recording</p>
            </>
          )}

          {recording && (
            <>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-2xl font-mono text-white">{formatTime(elapsed)}</span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors flex items-center justify-center border-2 border-red-500"
              >
                <div className="w-7 h-7 rounded bg-red-500" />
              </button>
              <p className="text-sm text-slate-400">Tap to stop</p>
            </>
          )}

          {processing && (
            <div className="flex flex-col items-center gap-3 py-4">
              <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-slate-400">{processingStep}</p>
            </div>
          )}

          {audioUrl && !processing && (
            <div className="w-full space-y-3">
              <audio controls src={audioUrl} className="w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{formatTime(elapsed)} recorded</span>
                <button
                  type="button"
                  onClick={discard}
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                >
                  Discard &amp; re-record
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
