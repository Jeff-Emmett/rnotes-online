'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';

interface Segment {
  id: number;
  text: string;
  start: number;
  end: number;
}

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

const VOICE_WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL || 'wss://voice.jeffemmett.com';

export function VoiceRecorder({ onResult, className }: VoiceRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>(
    'idle'
  );
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto-scroll transcript to bottom when new segments arrive
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [segments]);

  const addSegment = useCallback((seg: Segment) => {
    segmentsRef.current = [...segmentsRef.current, seg];
    setSegments([...segmentsRef.current]);
  }, []);

  const cleanup = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== 'closed'
    ) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setSegments([]);
    segmentsRef.current = [];
    setIsListening(false);
    setStreaming(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start MediaRecorder for the audio file
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      // Try to set up WebSocket streaming for live transcription
      try {
        const ws = new WebSocket(`${VOICE_WS_URL}/api/voice/stream`);
        wsRef.current = ws;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
          };
        });

        // WebSocket message handler
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'listening') {
              setIsListening(true);
              setTimeout(() => setIsListening(false), 600);
            } else if (data.type === 'segment') {
              addSegment({
                id: data.id,
                text: data.text,
                start: data.start,
                end: data.end,
              });
            }
          } catch {
            // Ignore parse errors
          }
        };

        // Set up AudioContext at 16kHz and AudioWorklet for PCM16 streaming
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        await audioCtx.audioWorklet.addModule('/pcm-processor.js');
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(e.data as ArrayBuffer);
          }
        };

        source.connect(workletNode);
        // Don't connect to destination — we don't want to hear ourselves
        setStreaming(true);
      } catch (wsErr) {
        console.warn(
          'WebSocket streaming unavailable, will batch transcribe:',
          wsErr
        );
        setStreaming(false);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }

      // Start timer
      startTimeRef.current = Date.now();
      setStatus('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Microphone access denied'
      );
    }
  }, [addSegment]);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );
    setStatus('processing');

    // Stop AudioWorklet streaming
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Send "end" to WebSocket and wait for final segments
    let wsFullText = '';
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const ws = wsRef.current;
        wsFullText = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => resolve(''), 5000);

          const handler = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'segment') {
                addSegment({
                  id: data.id,
                  text: data.text,
                  start: data.start,
                  end: data.end,
                });
              }
              if (data.type === 'done') {
                clearTimeout(timeout);
                ws.removeEventListener('message', handler);
                resolve(data.fullText || '');
              }
            } catch {
              // Ignore
            }
          };

          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ type: 'end' }));
        });
      } catch {
        // Timeout or error — use accumulated segments
      }
    }

    // Close WebSocket and AudioContext
    cleanup();

    // Stop MediaRecorder and collect the audio blob
    const blob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        resolve(
          new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        );
      };
      mediaRecorder.stop();
    });

    const previewUrl = URL.createObjectURL(blob);
    setAudioUrl(previewUrl);

    try {
      // Upload audio file
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

      // Determine transcript: prefer WebSocket fullText, then assembled segments, then batch
      let transcript = wsFullText;

      if (!transcript && segmentsRef.current.length > 0) {
        transcript = segmentsRef.current.map((s) => s.text).join(' ');
      }

      if (!transcript) {
        // Fallback: batch transcription via API proxy
        try {
          const transcribeForm = new FormData();
          transcribeForm.append('audio', blob, 'recording.webm');

          const transcribeRes = await authFetch('/api/voice/transcribe', {
            method: 'POST',
            body: transcribeForm,
          });

          if (transcribeRes.ok) {
            const transcribeResult = await transcribeRes.json();
            transcript = transcribeResult.text || '';
          }
        } catch {
          console.warn('Batch transcription also failed');
        }
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
      setStatus('idle');
    }
  }, [onResult, addSegment, cleanup]);

  const discard = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setSegments([]);
    segmentsRef.current = [];
    setElapsed(0);
    setError(null);
    setStatus('idle');
  }, [audioUrl]);

  return (
    <div className={className}>
      <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
        {/* Recording controls */}
        <div className="flex flex-col items-center gap-4">
          {status === 'idle' && !audioUrl && (
            <>
              <button
                type="button"
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center"
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              <p className="text-sm text-slate-400">Tap to start recording</p>
            </>
          )}

          {status === 'recording' && (
            <>
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full transition-colors ${
                    isListening
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-red-500 animate-pulse'
                  }`}
                />
                <span className="text-2xl font-mono text-white">
                  {formatTime(elapsed)}
                </span>
                {streaming && (
                  <span className="text-xs text-green-400/70 font-medium tracking-wider">
                    LIVE
                  </span>
                )}
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

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <svg
                className="animate-spin h-8 w-8 text-amber-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm text-slate-400">
                Finalizing transcription...
              </p>
            </div>
          )}

          {audioUrl && status === 'idle' && (
            <div className="w-full space-y-3">
              <audio controls src={audioUrl} className="w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {formatTime(elapsed)} recorded
                </span>
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

        {/* Live transcript segments */}
        {segments.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Live Transcript
            </div>
            <div
              ref={transcriptScrollRef}
              className="space-y-1.5 max-h-48 overflow-y-auto"
            >
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className="text-sm text-slate-300 px-3 py-2 bg-slate-800/50 rounded border-l-2 border-amber-500/30 animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  {seg.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
