'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/authFetch';

// --- Types ---

interface Segment {
  id: number;
  text: string;
  start: number;
  end: number;
}

interface WhisperProgress {
  status: 'checking' | 'downloading' | 'loading' | 'transcribing' | 'done' | 'error';
  progress?: number;
  message?: string;
}

interface NotebookOption {
  id: string;
  title: string;
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'done';

// --- Constants ---

const VOICE_WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL || 'wss://voice.jeffemmett.com';

// Web Speech API types
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function getSpeechRecognition(): (new () => ISpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

// --- Component ---

export default function VoicePage() {
  const router = useRouter();

  // Recording state
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [streaming, setStreaming] = useState(false);

  // Transcript
  const [segments, setSegments] = useState<Segment[]>([]);
  const [liveText, setLiveText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  // Upload state
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadedMimeType, setUploadedMimeType] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);

  // UI
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [notebookId, setNotebookId] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [offlineProgress, setOfflineProgress] = useState<WhisperProgress | null>(null);
  const [saving, setSaving] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const liveTextRef = useRef('');
  const segmentsRef = useRef<Segment[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Load notebooks
  useEffect(() => {
    authFetch('/api/notebooks')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotebooks(data.map((nb: any) => ({ id: nb.id, title: nb.title })));
        }
      })
      .catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [segments, liveText, interimText]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // --- WebSocket live streaming ---

  const setupWebSocket = useCallback(async (stream: MediaStream) => {
    try {
      const ws = new WebSocket(`${VOICE_WS_URL}/api/voice/stream`);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 5000);
        ws.onopen = () => { clearTimeout(timeout); resolve(); };
        ws.onerror = () => { clearTimeout(timeout); reject(new Error('failed')); };
      });

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'segment') {
            const seg = { id: data.id, text: data.text, start: data.start, end: data.end };
            segmentsRef.current = [...segmentsRef.current, seg];
            setSegments([...segmentsRef.current]);
          }
        } catch {}
      };

      // AudioWorklet for PCM16 streaming at 16kHz
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      await audioCtx.audioWorklet.addModule('/pcm-processor.js');
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data as ArrayBuffer);
      };

      source.connect(workletNode);
      setStreaming(true);
    } catch {
      setStreaming(false);
    }
  }, []);

  // --- Web Speech API (live local) ---

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalized = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalized += event.results[i][0].transcript.trim() + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      liveTextRef.current = finalized.trim();
      setLiveText(finalized.trim());
      setInterimText(interim.trim());
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      // Auto-restart (Chrome stops after ~60s silence)
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch {}
    }
    setInterimText('');
  }, []);

  // --- Cleanup streaming ---

  const cleanupStreaming = useCallback(() => {
    if (workletNodeRef.current) { workletNodeRef.current.disconnect(); workletNodeRef.current = null; }
    if (sourceNodeRef.current) { sourceNodeRef.current.disconnect(); sourceNodeRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
      wsRef.current = null;
    }
    setStreaming(false);
  }, []);

  // --- Start recording ---

  const startRecording = useCallback(async () => {
    setSegments([]);
    segmentsRef.current = [];
    setLiveText('');
    liveTextRef.current = '';
    setInterimText('');
    setFinalTranscript('');
    setIsEditing(false);
    setStatus(null);
    setOfflineProgress(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      startTimeRef.current = Date.now();
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start both transcription methods in parallel
      setupWebSocket(stream);
      startSpeechRecognition();

    } catch (err) {
      setStatus({ message: err instanceof Error ? err.message : 'Microphone access denied', type: 'error' });
    }
  }, [setupWebSocket, startSpeechRecognition]);

  // --- Stop recording ---

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDuration(dur);

    // Capture live text before stopping
    const capturedLive = liveTextRef.current;
    stopSpeechRecognition();

    // Get WS final text
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
                const seg = { id: data.id, text: data.text, start: data.start, end: data.end };
                segmentsRef.current = [...segmentsRef.current, seg];
                setSegments([...segmentsRef.current]);
              }
              if (data.type === 'done') {
                clearTimeout(timeout);
                ws.removeEventListener('message', handler);
                resolve(data.fullText || '');
              }
            } catch {}
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ type: 'end' }));
        });
      } catch {}
    }
    cleanupStreaming();

    setState('processing');

    // Stop recorder
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      recorder.stop();
    });
    audioBlobRef.current = blob;

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    // Use live transcript immediately (best quality in practice)
    const liveResult = wsFullText || (segmentsRef.current.length > 0
      ? segmentsRef.current.map(s => s.text).join(' ')
      : capturedLive);
    setFinalTranscript(liveResult || '');

    // Upload audio file in background (needed for AUDIO note, not for transcript)
    try {
      setStatus({ message: 'Uploading recording...', type: 'loading' });
      const uploadForm = new FormData();
      uploadForm.append('file', blob, 'voice-note.webm');
      const uploadRes = await authFetch('/api/uploads', { method: 'POST', body: uploadForm });

      if (uploadRes.ok) {
        const uploadResult = await uploadRes.json();
        setUploadedFileUrl(uploadResult.url);
        setUploadedMimeType(uploadResult.mimeType);
        setUploadedFileSize(uploadResult.size);
      }
    } catch {
      console.warn('Audio upload failed');
    }

    // If no live transcript at all, try offline Parakeet as last resort
    if (!liveResult) {
      try {
        setStatus({ message: 'Loading offline model...', type: 'loading' });
        const { transcribeOffline } = await import('@/lib/parakeetOffline');
        const offlineText = await transcribeOffline(blob, (p) => setOfflineProgress(p));
        setFinalTranscript(offlineText);
        setOfflineProgress(null);
      } catch {
        setOfflineProgress(null);
      }
    }

    setStatus(null);
    setState('done');
  }, [audioUrl, stopSpeechRecognition, cleanupStreaming]);

  // --- Toggle ---

  const toggleRecording = useCallback(() => {
    if (state === 'idle' || state === 'done') startRecording();
    else if (state === 'recording') stopRecording();
  }, [state, startRecording, stopRecording]);

  // --- Save ---

  const saveToRNotes = useCallback(async () => {
    setSaving(true);
    setStatus({ message: 'Saving...', type: 'loading' });

    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const transcript = finalTranscript.trim();
    const body: Record<string, unknown> = {
      title: `Voice note - ${timeStr}`,
      content: transcript
        ? `<p>${transcript.replace(/\n/g, '</p><p>')}</p>`
        : '<p><em>Voice recording (no transcript)</em></p>',
      type: 'AUDIO',
      mimeType: uploadedMimeType || 'audio/webm',
      fileUrl: uploadedFileUrl,
      fileSize: uploadedFileSize,
      duration,
      tags: ['voice'],
    };
    if (notebookId) body.notebookId = notebookId;

    // If upload failed earlier, try uploading now
    if (!uploadedFileUrl && audioBlobRef.current) {
      try {
        const form = new FormData();
        form.append('file', audioBlobRef.current, 'voice-note.webm');
        const res = await authFetch('/api/uploads', { method: 'POST', body: form });
        if (res.ok) {
          const result = await res.json();
          body.fileUrl = result.url;
          body.mimeType = result.mimeType;
          body.fileSize = result.size;
        }
      } catch {}
    }

    try {
      const res = await authFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      const note = await res.json();
      setStatus({ message: 'Saved!', type: 'success' });
      setTimeout(() => router.push(`/notes/${note.id}`), 1000);
    } catch (err) {
      setStatus({ message: err instanceof Error ? err.message : 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [finalTranscript, uploadedFileUrl, uploadedMimeType, uploadedFileSize, duration, notebookId, router]);

  // --- Copy ---

  const copyTranscript = useCallback(async () => {
    if (!finalTranscript.trim()) return;
    try {
      await navigator.clipboard.writeText(finalTranscript);
      setStatus({ message: 'Copied!', type: 'success' });
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus({ message: 'Copy failed', type: 'error' });
    }
  }, [finalTranscript]);

  // --- Reset ---

  const discard = useCallback(() => {
    setState('idle');
    setSegments([]);
    segmentsRef.current = [];
    setLiveText('');
    liveTextRef.current = '';
    setInterimText('');
    setFinalTranscript('');
    setIsEditing(false);
    setElapsed(0);
    setDuration(0);
    setStatus(null);
    setOfflineProgress(null);
    setUploadedFileUrl('');
    setUploadedMimeType('');
    setUploadedFileSize(0);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    audioBlobRef.current = null;
  }, [audioUrl]);

  // --- Keyboard ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecording();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'Enter' && state === 'done') {
        e.preventDefault();
        saveToRNotes();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleRecording, saveToRNotes, state]);

  // --- Render ---

  const hasLiveText = liveText || interimText || segments.length > 0;
  const hasTranscript = state === 'done' && finalTranscript.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">rVoice</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Voice notes for rNotes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
          {getSpeechRecognition() && state === 'recording' && !streaming && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Local
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">

        {/* Record button + timer */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={toggleRecording}
            disabled={state === 'processing'}
            className={`w-24 h-24 rounded-full border-[3px] flex items-center justify-center transition-all relative ${
              state === 'recording'
                ? 'border-red-500 bg-slate-900'
                : state === 'processing'
                ? 'border-slate-600 bg-slate-900 opacity-50'
                : 'border-slate-600 bg-slate-900 hover:border-red-500'
            }`}
          >
            <div className={`transition-all ${
              state === 'recording'
                ? 'w-8 h-8 rounded-md bg-red-500'
                : 'w-10 h-10 rounded-full bg-red-500'
            }`} />
            {state === 'recording' && (
              <span className="absolute inset-[-6px] rounded-full border-2 border-red-500/30 animate-ping" />
            )}
          </button>

          <div className={`text-3xl font-mono font-bold tracking-wider ${
            state === 'recording' ? 'text-red-500' : 'text-slate-300'
          }`}>
            {formatTime(state === 'done' ? duration : elapsed)}
          </div>

          <p className="text-xs text-slate-500">
            {state === 'idle' && 'Tap to record or press Space'}
            {state === 'recording' && 'Recording... tap to stop'}
            {state === 'processing' && (offlineProgress?.message || 'Processing...')}
            {state === 'done' && 'Recording complete'}
          </p>
        </div>

        {/* Offline model progress bar */}
        {offlineProgress && offlineProgress.status === 'downloading' && (
          <div className="w-full max-w-xs">
            <div className="text-xs text-slate-400 mb-1 text-center">{offlineProgress.message}</div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${offlineProgress.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Live transcript (while recording) */}
        {state === 'recording' && hasLiveText && (
          <div className="w-full">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Live transcript</div>
            <div
              ref={transcriptRef}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto"
            >
              {segments.length > 0 && (
                <div className="space-y-1">
                  {segments.map((seg) => (
                    <p key={seg.id} className="text-sm text-slate-300">{seg.text}</p>
                  ))}
                </div>
              )}
              {segments.length === 0 && liveText && (
                <p className="text-sm text-slate-300">{liveText}</p>
              )}
              {interimText && (
                <p className="text-sm text-slate-500 italic">{interimText}</p>
              )}
            </div>
          </div>
        )}

        {/* Audio player + transcript (after recording) */}
        {(state === 'done' || state === 'processing') && audioUrl && (
          <div className="w-full space-y-4">
            <audio controls src={audioUrl} className="w-full h-10" />

            {/* Transcript */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Transcript</span>
                {state === 'done' && finalTranscript && (
                  <button
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if (!isEditing) setTimeout(() => editRef.current?.focus(), 50);
                    }}
                    className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {isEditing ? 'Done editing' : 'Edit'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  ref={editRef}
                  value={finalTranscript}
                  onChange={(e) => setFinalTranscript(e.target.value)}
                  className="w-full min-h-[100px] bg-slate-900/50 border border-amber-500/30 rounded-lg p-4 text-sm text-slate-200 leading-relaxed resize-y focus:outline-none focus:border-amber-500/50"
                />
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 min-h-[60px] max-h-48 overflow-y-auto">
                  {finalTranscript ? (
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{finalTranscript}</p>
                  ) : state === 'processing' ? (
                    <p className="text-sm text-slate-500 italic">Transcribing...</p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No transcript available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notebook + actions (after recording) */}
        {state === 'done' && (
          <div className="w-full space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                Save to notebook
              </label>
              <select
                value={notebookId}
                onChange={(e) => setNotebookId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="">No notebook (standalone)</option>
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id}>{nb.title}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={discard}
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                Discard
              </button>
              {hasTranscript && (
                <button
                  onClick={copyTranscript}
                  className="px-4 py-2.5 bg-slate-800 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Copy
                </button>
              )}
              <button
                onClick={saveToRNotes}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving...' : 'Save to rNotes'}
              </button>
            </div>
          </div>
        )}

        {/* Status bar */}
        {status && (
          <div className={`w-full text-center text-xs px-4 py-2 rounded-lg ${
            status.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
            status.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' :
            'bg-blue-900/30 text-blue-400 border border-blue-800'
          }`}>
            {status.message}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-3 flex items-center justify-between text-[10px] text-slate-600">
        <div className="flex gap-3">
          <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px]">Space</kbd>
          <span>record</span>
          <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px]">Ctrl+Enter</kbd>
          <span>save</span>
        </div>
        <a href="/" className="hover:text-amber-400 transition-colors">rNotes.online</a>
      </footer>
    </div>
  );
}
