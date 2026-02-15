/**
 * Offline Whisper transcription using @xenova/transformers (Transformers.js v2).
 * Dynamically imports the library to avoid SSR issues.
 * Uses Xenova/whisper-tiny with quantized weights (~45MB download).
 * Model is cached by the browser after first download.
 */

const MODEL_ID = 'Xenova/whisper-tiny';
const CACHE_KEY = 'whisper-offline-cached';

export interface WhisperProgress {
  status: 'checking' | 'downloading' | 'loading' | 'transcribing' | 'done' | 'error';
  progress?: number; // 0-100 for download progress
  file?: string;
  message?: string;
}

type ProgressCallback = (progress: WhisperProgress) => void;

// Keep a singleton pipeline so we don't reload on subsequent calls
let cachedPipeline: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Check if the Whisper model has been downloaded before.
 * Note: this is a best-effort check via localStorage flag.
 * The actual model cache is managed by Transformers.js via Cache API.
 */
export function isModelCached(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CACHE_KEY) === 'true';
}

/**
 * Get or create the Whisper pipeline singleton.
 */
async function getPipeline(onProgress?: ProgressCallback): Promise<any> {
  if (cachedPipeline) return cachedPipeline;

  // Prevent multiple concurrent loads
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    onProgress?.({ status: 'loading', message: 'Loading Whisper model...' });

    const { pipeline, env } = await import('@xenova/transformers');

    // Disable local model checks — always use browser cache / HF Hub
    env.allowLocalModels = false;

    const pipe = await pipeline('automatic-speech-recognition', MODEL_ID, {
      quantized: true,
      progress_callback: (p: any) => {
        if (p.status === 'progress' && p.progress !== undefined) {
          onProgress?.({
            status: 'downloading',
            progress: Math.round(p.progress),
            file: p.file,
            message: `Downloading model... ${Math.round(p.progress)}%`,
          });
        } else if (p.status === 'ready') {
          localStorage.setItem(CACHE_KEY, 'true');
          onProgress?.({ status: 'loading', message: 'Model loaded' });
        }
      },
    });

    cachedPipeline = pipe;
    loadingPromise = null;
    return pipe;
  })();

  return loadingPromise;
}

/**
 * Decode an audio Blob to Float32Array at 16kHz mono.
 */
async function decodeAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Transcribe an audio Blob offline using Whisper in the browser.
 *
 * First call will download the model (~45MB). Subsequent calls use the cached model.
 * Returns the transcribed text.
 */
export async function transcribeOffline(
  audioBlob: Blob,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    const pipe = await getPipeline(onProgress);

    onProgress?.({ status: 'transcribing', message: 'Transcribing audio...' });

    const audioData = await decodeAudioBlob(audioBlob);

    const result = await pipe(audioData, {
      language: 'en',
      return_timestamps: false,
    });

    const text = (result as any).text?.trim() || '';
    onProgress?.({ status: 'done', message: 'Transcription complete' });
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    onProgress?.({ status: 'error', message });
    throw err;
  }
}
