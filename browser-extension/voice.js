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
let uploadedFileUrl = '';
let uploadedMimeType = '';
let uploadedFileSize = 0;
let duration = 0;

// --- DOM refs ---
const recBtn = document.getElementById('recBtn');
const timerEl = document.getElementById('timer');
const statusLabel = document.getElementById('statusLabel');
const transcriptArea = document.getElementById('transcriptArea');
const transcriptText = document.getElementById('transcriptText');
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

// --- Recording ---

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

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
    transcriptArea.classList.remove('visible');
    statusBar.className = 'status-bar';

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = formatTime(elapsed);
    }, 1000);

  } catch (err) {
    showStatusBar(err.message || 'Microphone access denied', 'error');
  }
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(timerInterval);
  timerInterval = null;
  duration = Math.floor((Date.now() - startTime) / 1000);

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

  // Show transcript area with placeholder
  transcriptArea.classList.add('visible');
  transcriptText.innerHTML = '<span class="placeholder">Transcribing...</span>';

  // Upload audio file
  const token = await getToken();
  const settings = await getSettings();

  try {
    showStatusBar('Uploading recording...', 'loading');

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

    // Transcribe via batch API
    showStatusBar('Transcribing...', 'loading');

    const transcribeForm = new FormData();
    transcribeForm.append('audio', audioBlob, 'voice-note.webm');

    const transcribeRes = await fetch(`${settings.host}/api/voice/transcribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: transcribeForm,
    });

    if (transcribeRes.ok) {
      const transcribeResult = await transcribeRes.json();
      transcript = transcribeResult.text || '';
    } else {
      transcript = '';
      console.warn('Transcription failed, saving without transcript');
    }

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
  uploadedFileUrl = '';
  uploadedMimeType = '';
  uploadedFileSize = 0;
  duration = 0;

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
