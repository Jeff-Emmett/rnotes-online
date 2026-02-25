/**
 * Offline transcription using parakeet.js (NVIDIA Parakeet TDT 0.6B v2).
 * Loaded at runtime from CDN. Model ~634 MB (int8) on first download,
 * cached in IndexedDB after. Works fully offline after first download.
 *
 * Port of src/lib/parakeetOffline.ts for the browser extension.
 */

const CACHE_KEY = 'parakeet-offline-cached';

// Singleton model — don't reload on subsequent calls
let cachedModel = null;
let loadingPromise = null;

/**
 * Check if the Parakeet model has been downloaded before.
 */
function isModelCached() {
  try {
    return localStorage.getItem(CACHE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Detect WebGPU availability.
 */
async function detectWebGPU() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Get or create the Parakeet model singleton.
 * @param {function} onProgress - callback({ status, progress, file, message })
 */
async function getModel(onProgress) {
  if (cachedModel) return cachedModel;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    onProgress?.({ status: 'loading', message: 'Loading Parakeet model...' });

    // Dynamic import from CDN at runtime
    const { fromHub } = await import('https://esm.sh/parakeet.js@1.1.2');

    const backend = (await detectWebGPU()) ? 'webgpu' : 'wasm';
    const fileProgress = {};

    const model = await fromHub('parakeet-tdt-0.6b-v2', {
      backend,
      progress: ({ file, loaded, total }) => {
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
            message: `Downloading model... ${pct}%`,
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
async function decodeAudioBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

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
 * First call downloads the model (~634 MB). Subsequent calls use cached.
 *
 * @param {Blob} audioBlob
 * @param {function} onProgress - callback({ status, progress, file, message })
 * @returns {Promise<string>} transcribed text
 */
async function transcribeOffline(audioBlob, onProgress) {
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
}

// Export for use in voice.js (loaded as ES module)
window.ParakeetOffline = {
  isModelCached,
  transcribeOffline,
};
