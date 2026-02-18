'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* Web Speech API types — not in default TS lib */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string; confidence: number };
  [index: number]: { transcript: string; confidence: number };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

type DemoStatus = 'idle' | 'listening' | 'unsupported';

interface TranscriptLine {
  id: number;
  text: string;
  final: boolean;
}

export function TranscriptionDemo() {
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, interim]);

  const start = useCallback(() => {
    if (!supported) {
      setStatus('unsupported');
      return;
    }

    const Ctor: SpeechRecognitionCtor | undefined =
      (window as unknown as Record<string, SpeechRecognitionCtor>).SpeechRecognition ||
      (window as unknown as Record<string, SpeechRecognitionCtor>).webkitSpeechRecognition;
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const id = ++lineIdRef.current;
          setLines((prev) => [...prev, { id, text: result[0].transcript.trim(), final: true }]);
          interimText = '';
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    setLines([]);
    setInterim('');
    lineIdRef.current = 0;
    setElapsed(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    recognition.start();
    setStatus('listening');
  }, [supported, status]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setInterim('');
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    stop();
    setLines([]);
    setElapsed(0);
  }, [stop]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm font-medium text-slate-300">Live Transcription</span>
            {status === 'listening' && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          {status === 'listening' && (
            <span className="text-xs font-mono text-slate-400">{formatTime(elapsed)}</span>
          )}
        </div>

        {/* Transcript area */}
        <div
          ref={scrollRef}
          className="min-h-[120px] max-h-[200px] overflow-y-auto px-5 py-4"
        >
          {status === 'idle' && lines.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[120px] text-center">
              <svg className="w-10 h-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm text-slate-500">
                Tap the mic to start live transcription
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Works in your browser — no download needed
              </p>
            </div>
          )}

          {status === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-[120px] text-center">
              <p className="text-sm text-slate-400">
                Speech recognition requires Chrome, Edge, or Safari.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                rNotes also supports offline transcription with Parakeet.js (NVIDIA) for full privacy.
              </p>
            </div>
          )}

          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="text-sm text-slate-200 px-3 py-2 bg-slate-900/50 rounded-lg border-l-2 border-amber-500/40"
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}

          {interim && (
            <div className="text-sm text-slate-400 italic px-3 py-2 mt-2">
              {interim}
            </div>
          )}

          {status === 'idle' && lines.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {lines.length} segment{lines.length !== 1 ? 's' : ''} transcribed
              </span>
              <button
                onClick={reset}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-slate-700/50">
          {status === 'idle' ? (
            <button
              onClick={start}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-medium text-sm rounded-full transition-all shadow-lg shadow-amber-900/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Start Transcribing
            </button>
          ) : status === 'listening' ? (
            <button
              onClick={stop}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm rounded-full transition-colors border border-red-500/50"
            >
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              Stop
            </button>
          ) : null}
        </div>

        {/* Capability badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 px-5 pb-4 text-[11px] text-slate-500">
          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/30">
            Live streaming
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/30">
            Audio file upload
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/30">
            Video transcription
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/30">
            Offline (Parakeet.js)
          </span>
        </div>
      </div>
    </div>
  );
}
