/**
 * Offline transcription using parakeet.js (NVIDIA Parakeet TDT 0.6B v2).
 * Loaded at runtime from CDN to avoid Next.js/webpack bundling issues
 * with onnxruntime-web's node-specific files.
 * Model is ~634 MB (int8) on first download, cached in IndexedDB after.
 * Much higher accuracy than Whisper-tiny at the cost of larger model size.
 */

const CACHE_KEY = 'parakeet-offline-cached';

export interface WhisperProgress {
  status: 'checking' | 'downloading' | 'loading' | 'transcribing' | 'done' | 'error';
  progress?: number;
  file?: string;
  message?: string;
}

type ProgressCallback = (progress: WhisperProgress) => void;

// Singleton model — don't reload on subsequent calls
let cachedModel: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Check if the Parakeet model has been downloaded before.
 * Best-effort check via localStorage flag; actual cache is in IndexedDB.
 */
export function isModelCached(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CACHE_KEY) === 'true';
}

/**
 * Detect WebGPU availability in the current browser.
 */
async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !(navigator as any).gpu) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Get or create the Parakeet model singleton.
 */
async function getModel(onProgress?: ProgressCallback): Promise<any> {
  if (cachedModel) return cachedModel;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    onProgress?.({ status: 'loading', message: 'Loading Parakeet model...' });

    // Load from CDN at runtime — avoids webpack/Terser issues with onnxruntime-web.
    // Use indirect dynamic import so webpack can't statically analyze the URL.
    const importModule = new Function('url', 'return import(url)');
    const { fromHub } = await importModule('https://esm.sh/parakeet.js@1.1.2');

    const backend = (await detectWebGPU()) ? 'webgpu' : 'wasm';
    const fileProgress: Record<string, { loaded: number; total: number }> = {};

    const model = await fromHub('parakeet-tdt-0.6b-v2', {
      backend,
      progress: ({ file, loaded, total }: { file: string; loaded: number; total: number }) => {
        fileProgress[file] = { loaded, total };

        let totalBytes = 0;
        let loadedBytes = 0;
        for (const fp of Object.values(fileProgress)) {
          totalBytes += fp.total || 0;
          loadedBytes += fp.loaded || 0;
        }

        if (totalBytes > 0) {
          const pct = Math.round((loadedBytes / totalBytes) * 100);
          onProgress?.({
            status: 'downloading',
            progress: pct,
            file,
            message: `Downloading Parakeet model... ${pct}%`,
          });
        }
      },
    });

    localStorage.setItem(CACHE_KEY, 'true');
    onProgress?.({ status: 'loading', message: 'Model loaded' });

    cachedModel = model;
    loadingPromise = null;
    return model;
  })();

  return loadingPromise;
}

/**
 * Decode an audio Blob to Float32Array at 16 kHz mono.
 */
async function decodeAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Already 16 kHz mono — return directly
    if (audioBuffer.sampleRate === 16000 && audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // Resample via OfflineAudioContext
    const numSamples = Math.ceil(audioBuffer.duration * 16000);
    const offlineCtx = new OfflineAudioContext(1, numSamples, 16000);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const resampled = await offlineCtx.startRendering();
    return resampled.getChannelData(0);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Transcribe an audio Blob offline using Parakeet in the browser.
 *
 * First call downloads the model (~634 MB). Subsequent calls use cached model.
 * Returns the transcribed text.
 */
export async function transcribeOffline(
  audioBlob: Blob,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    const model = await getModel(onProgress);

    onProgress?.({ status: 'transcribing', message: 'Transcribing audio...' });

    const audioData = await decodeAudioBlob(audioBlob);

    const result = await model.transcribe(audioData, 16000, {
      returnTimestamps: false,
      enableProfiling: false,
    });

    const text = result.utterance_text?.trim() || '';
    onProgress?.({ status: 'done', message: 'Transcription complete' });
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    onProgress?.({ status: 'error', message });
    throw err;
  }
}
