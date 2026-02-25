const DEFAULT_HOST = 'https://rnotes.online';

// --- State ---
let state = 'idle'; // idle | recording | processing | done
let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let startTime = 0;
let audioBlob = null;
let audioUrl = null;
let transcript = '';
let liveTranscript = ''; // accumulated from Web Speech API
let uploadedFileUrl = '';
let uploadedMimeType = '';
let uploadedFileSize = 0;
let duration = 0;

// Web Speech API
let recognition = null;
let speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// --- DOM refs ---
const recBtn = document.getElementById('recBtn');
const timerEl = document.getElementById('timer');
const statusLabel = document.getElementById('statusLabel');
const transcriptArea = document.getElementById('transcriptArea');
const transcriptText = document.getElementById('transcriptText');
const liveIndicator = document.getElementById('liveIndicator');
const audioPreview = document.getElementById('audioPreview');
const audioPlayer = document.getElementById('audioPlayer');
const notebookSelect = document.getElementById('notebook');
const postActions = document.getElementById('postActions');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');
const copyBtn = document.getElementById('copyBtn');
const statusBar = document.getElementById('statusBar');
const authWarning = document.getElementById('authWarning');
const closeBtn = document.getElementById('closeBtn');

// --- Helpers ---

async function getSettings() {
  const result = await chrome.storage.sync.get(['rnotesHost']);
  return { host: result.rnotesHost || DEFAULT_HOST };
}

async function getToken() {
  const result = await chrome.storage.local.get(['encryptid_token']);
  return result.encryptid_token || null;
}

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setStatusLabel(text, cls) {
  statusLabel.textContent = text;
  statusLabel.className = `status-label ${cls}`;
}

function showStatusBar(message, type) {
  statusBar.textContent = message;
  statusBar.className = `status-bar visible ${type}`;
  if (type === 'success') {
    setTimeout(() => { statusBar.className = 'status-bar'; }, 3000);
  }
}

// --- Parakeet progress UI ---

const progressArea = document.getElementById('progressArea');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');

function showParakeetProgress(p) {
  if (!progressArea) return;
  progressArea.classList.add('visible');

  if (p.message) {
    progressLabel.textContent = p.message;
  }

  if (p.status === 'downloading' && p.progress !== undefined) {
    progressFill.style.width = `${p.progress}%`;
  } else if (p.status === 'transcribing') {
    progressFill.style.width = '100%';
  } else if (p.status === 'loading') {
    progressFill.style.width = '0%';
  }
}

function hideParakeetProgress() {
  if (progressArea) {
    progressArea.classList.remove('visible');
    progressFill.style.width = '0%';
  }
}

// --- Notebook loader ---

async function loadNotebooks() {
  const token = await getToken();
  if (!token) return;
  const settings = await getSettings();

  try {
    const res = await fetch(`${settings.host}/api/notebooks`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const notebooks = await res.json();

    for (const nb of notebooks) {
      const opt = document.createElement('option');
      opt.value = nb.id;
      opt.textContent = nb.title;
      notebookSelect.appendChild(opt);
    }

    // Restore last used
    const { lastNotebookId } = await chrome.storage.local.get(['lastNotebookId']);
    if (lastNotebookId) notebookSelect.value = lastNotebookId;
  } catch (err) {
    console.error('Failed to load notebooks:', err);
  }
}

notebookSelect.addEventListener('change', (e) => {
  chrome.storage.local.set({ lastNotebookId: e.target.value });
});

// --- Live transcription (Web Speech API) ---

function startLiveTranscription() {
  if (!speechSupported) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalizedText = '';

  recognition.onresult = (event) => {
    let interimText = '';
    // Rebuild finalized text from all final results
    finalizedText = '';
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalizedText += result[0].transcript.trim() + ' ';
      } else {
        interimText += result[0].transcript;
      }
    }

    liveTranscript = finalizedText.trim();

    // Update the live transcript display
    updateLiveDisplay(finalizedText.trim(), interimText.trim());
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      console.warn('Speech recognition error:', event.error);
    }
  };

  // Auto-restart on end (Chrome stops after ~60s of silence)
  recognition.onend = () => {
    if (state === 'recording' && recognition) {
      try { recognition.start(); } catch {}
    }
  };

  try {
    recognition.start();
    if (liveIndicator) liveIndicator.classList.add('visible');
  } catch (err) {
    console.warn('Could not start speech recognition:', err);
    speechSupported = false;
  }
}

function stopLiveTranscription() {
  if (recognition) {
    const ref = recognition;
    recognition = null;
    try { ref.stop(); } catch {}
  }
  if (liveIndicator) liveIndicator.classList.remove('visible');
}

function updateLiveDisplay(finalText, interimText) {
  if (state !== 'recording') return;

  // Show transcript area while recording
  transcriptArea.classList.add('visible');

  let html = '';
  if (finalText) {
    html += `<span class="final-text">${escapeHtml(finalText)}</span>`;
  }
  if (interimText) {
    html += `<span class="interim-text">${escapeHtml(interimText)}</span>`;
  }
  if (!finalText && !interimText) {
    html = '<span class="placeholder">Listening...</span>';
  }
  transcriptText.innerHTML = html;

  // Auto-scroll
  transcriptText.scrollTop = transcriptText.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Recording ---

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];
    liveTranscript = '';

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(1000);
    startTime = Date.now();
    state = 'recording';

    // UI updates
    recBtn.classList.add('recording');
    timerEl.classList.add('recording');
    setStatusLabel('Recording', 'recording');
    postActions.style.display = 'none';
    audioPreview.classList.remove('visible');
    statusBar.className = 'status-bar';

    // Show transcript area with listening placeholder
    if (speechSupported) {
      transcriptArea.classList.add('visible');
      transcriptText.innerHTML = '<span class="placeholder">Listening...</span>';
    } else {
      transcriptArea.classList.remove('visible');
    }

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = formatTime(elapsed);
    }, 1000);

    // Start live transcription alongside recording
    startLiveTranscription();

  } catch (err) {
    showStatusBar(err.message || 'Microphone access denied', 'error');
  }
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(timerInterval);
  timerInterval = null;
  duration = Math.floor((Date.now() - startTime) / 1000);

  // Capture live transcript before stopping recognition
  const capturedLiveTranscript = liveTranscript;

  // Stop live transcription
  stopLiveTranscription();

  state = 'processing';
  recBtn.classList.remove('recording');
  timerEl.classList.remove('recording');
  setStatusLabel('Processing...', 'processing');

  // Stop recorder and collect blob
  audioBlob = await new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(audioChunks, { type: mediaRecorder.mimeType }));
    };
    mediaRecorder.stop();
  });

  // Show audio preview
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(audioBlob);
  audioPlayer.src = audioUrl;
  audioPreview.classList.add('visible');

  // Show live transcript while we process (if we have one)
  transcriptArea.classList.add('visible');
  if (capturedLiveTranscript) {
    transcriptText.textContent = capturedLiveTranscript;
    showStatusBar('Improving transcript...', 'loading');
  } else {
    transcriptText.innerHTML = '<span class="placeholder">Transcribing...</span>';
    showStatusBar('Uploading & transcribing...', 'loading');
  }

  // Upload audio file
  const token = await getToken();
  const settings = await getSettings();

  try {
    const uploadForm = new FormData();
    uploadForm.append('file', audioBlob, 'voice-note.webm');

    const uploadRes = await fetch(`${settings.host}/api/uploads`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: uploadForm,
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    const uploadResult = await uploadRes.json();
    uploadedFileUrl = uploadResult.url;
    uploadedMimeType = uploadResult.mimeType;
    uploadedFileSize = uploadResult.size;

    // --- Three-tier transcription cascade ---

    // Tier 1: Batch API (Whisper on server — highest quality)
    let bestTranscript = '';
    try {
      showStatusBar('Transcribing via server...', 'loading');
      const transcribeForm = new FormData();
      transcribeForm.append('audio', audioBlob, 'voice-note.webm');

      const transcribeRes = await fetch(`${settings.host}/api/voice/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: transcribeForm,
      });

      if (transcribeRes.ok) {
        const transcribeResult = await transcribeRes.json();
        bestTranscript = transcribeResult.text || '';
      }
    } catch {
      console.warn('Tier 1 (batch API) unavailable');
    }

    // Tier 2: Live transcript from Web Speech API (already captured)
    if (!bestTranscript && capturedLiveTranscript) {
      bestTranscript = capturedLiveTranscript;
    }

    // Tier 3: Offline Parakeet.js (NVIDIA, runs in browser)
    if (!bestTranscript && window.ParakeetOffline) {
      try {
        showStatusBar('Transcribing offline (Parakeet)...', 'loading');
        bestTranscript = await window.ParakeetOffline.transcribeOffline(audioBlob, (p) => {
          showParakeetProgress(p);
        });
        hideParakeetProgress();
      } catch (offlineErr) {
        console.warn('Tier 3 (Parakeet offline) failed:', offlineErr);
        hideParakeetProgress();
      }
    }

    transcript = bestTranscript;

    // Show transcript (editable)
    if (transcript) {
      transcriptText.textContent = transcript;
    } else {
      transcriptText.innerHTML = '<span class="placeholder">No transcript available - you can type one here</span>';
    }

    state = 'done';
    setStatusLabel('Done', 'done');
    postActions.style.display = 'flex';
    statusBar.className = 'status-bar';

  } catch (err) {
    // On upload error, try offline transcription directly
    let fallbackTranscript = capturedLiveTranscript || '';

    if (!fallbackTranscript && window.ParakeetOffline) {
      try {
        showStatusBar('Upload failed, transcribing offline...', 'loading');
        fallbackTranscript = await window.ParakeetOffline.transcribeOffline(audioBlob, (p) => {
          showParakeetProgress(p);
        });
        hideParakeetProgress();
      } catch {
        hideParakeetProgress();
      }
    }

    transcript = fallbackTranscript;
    if (transcript) {
      transcriptText.textContent = transcript;
    }

    showStatusBar(`Error: ${err.message}`, 'error');
    state = 'done';
    setStatusLabel('Error', 'idle');
    postActions.style.display = 'flex';
  }
}

function toggleRecording() {
  if (state === 'idle' || state === 'done') {
    startRecording();
  } else if (state === 'recording') {
    stopRecording();
  }
  // Ignore clicks while processing
}

// --- Save to rNotes ---

async function saveToRNotes() {
  saveBtn.disabled = true;
  showStatusBar('Saving to rNotes...', 'loading');

  const token = await getToken();
  const settings = await getSettings();

  // Get current transcript text (user may have edited it)
  const editedTranscript = transcriptText.textContent.trim();
  const isPlaceholder = transcriptText.querySelector('.placeholder') !== null;
  const finalTranscript = isPlaceholder ? '' : editedTranscript;

  const now = new Date();
  const timeStr = now.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true
  });

  const body = {
    title: `Voice note - ${timeStr}`,
    content: finalTranscript
      ? `<p>${finalTranscript.replace(/\n/g, '</p><p>')}</p>`
      : '<p><em>Voice recording (no transcript)</em></p>',
    type: 'AUDIO',
    mimeType: uploadedMimeType || 'audio/webm',
    fileUrl: uploadedFileUrl,
    fileSize: uploadedFileSize,
    duration: duration,
    tags: ['voice'],
  };

  const notebookId = notebookSelect.value;
  if (notebookId) body.notebookId = notebookId;

  try {
    const res = await fetch(`${settings.host}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }

    showStatusBar('Saved to rNotes!', 'success');

    // Notify
    chrome.runtime.sendMessage({
      type: 'notify',
      title: 'Voice Note Saved',
      message: `${formatTime(duration)} recording saved to rNotes`,
    });

    // Reset after short delay
    setTimeout(resetState, 1500);

  } catch (err) {
    showStatusBar(`Save failed: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

// --- Copy to clipboard ---

async function copyTranscript() {
  const text = transcriptText.textContent.trim();
  if (!text || transcriptText.querySelector('.placeholder')) {
    showStatusBar('No transcript to copy', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showStatusBar('Copied to clipboard', 'success');
  } catch {
    showStatusBar('Copy failed', 'error');
  }
}

// --- Discard ---

function resetState() {
  state = 'idle';
  mediaRecorder = null;
  audioChunks = [];
  audioBlob = null;
  transcript = '';
  liveTranscript = '';
  uploadedFileUrl = '';
  uploadedMimeType = '';
  uploadedFileSize = 0;
  duration = 0;

  stopLiveTranscription();

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }

  timerEl.textContent = '00:00';
  timerEl.classList.remove('recording');
  recBtn.classList.remove('recording');
  setStatusLabel('Ready', 'idle');
  postActions.style.display = 'none';
  audioPreview.classList.remove('visible');
  transcriptArea.classList.remove('visible');
  hideParakeetProgress();
  statusBar.className = 'status-bar';
}

// --- Keyboard shortcuts ---

document.addEventListener('keydown', (e) => {
  // Space bar: toggle recording (unless editing transcript)
  if (e.code === 'Space' && document.activeElement !== transcriptText) {
    e.preventDefault();
    toggleRecording();
  }
  // Escape: close window
  if (e.code === 'Escape') {
    window.close();
  }
  // Ctrl+Enter: save (when in done state)
  if ((e.ctrlKey || e.metaKey) && e.code === 'Enter' && state === 'done') {
    e.preventDefault();
    saveToRNotes();
  }
});

// Clear placeholder on focus
transcriptText.addEventListener('focus', () => {
  const ph = transcriptText.querySelector('.placeholder');
  if (ph) transcriptText.textContent = '';
});

// --- Event listeners ---

recBtn.addEventListener('click', toggleRecording);
saveBtn.addEventListener('click', saveToRNotes);
discardBtn.addEventListener('click', resetState);
copyBtn.addEventListener('click', copyTranscript);
closeBtn.addEventListener('click', () => window.close());

// --- Init ---

async function init() {
  const token = await getToken();
  const claims = token ? decodeToken(token) : null;

  if (!claims) {
    authWarning.style.display = 'block';
    recBtn.style.opacity = '0.3';
    recBtn.style.pointerEvents = 'none';
    return;
  }

  authWarning.style.display = 'none';
  await loadNotebooks();
}

document.addEventListener('DOMContentLoaded', init);
