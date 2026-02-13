const DEFAULT_HOST = 'https://rnotes.online';

// --- Helpers ---

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status ${type}`;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 3000);
  }
}

// --- Auth UI ---

async function updateAuthUI() {
  const { encryptid_token } = await chrome.storage.local.get(['encryptid_token']);
  const claims = encryptid_token ? decodeToken(encryptid_token) : null;

  const authStatus = document.getElementById('authStatus');
  const loginSection = document.getElementById('loginSection');
  const loggedInSection = document.getElementById('loggedInSection');

  if (claims) {
    const username = claims.username || claims.sub?.slice(0, 20) || 'Authenticated';
    authStatus.textContent = `Signed in as ${username}`;
    authStatus.className = 'auth-status authed';
    loginSection.style.display = 'none';
    loggedInSection.style.display = 'block';
  } else {
    authStatus.textContent = 'Not signed in';
    authStatus.className = 'auth-status not-authed';
    loginSection.style.display = 'block';
    loggedInSection.style.display = 'none';
  }
}

async function populateNotebooks() {
  const { encryptid_token } = await chrome.storage.local.get(['encryptid_token']);
  if (!encryptid_token) return;

  const host = document.getElementById('host').value.replace(/\/+$/, '') || DEFAULT_HOST;

  try {
    const response = await fetch(`${host}/api/notebooks`, {
      headers: { 'Authorization': `Bearer ${encryptid_token}` },
    });

    if (!response.ok) return;

    const notebooks = await response.json();
    const select = document.getElementById('defaultNotebook');

    // Clear existing options (keep first)
    while (select.options.length > 1) {
      select.remove(1);
    }

    for (const nb of notebooks) {
      const option = document.createElement('option');
      option.value = nb.id;
      option.textContent = nb.title;
      select.appendChild(option);
    }

    // Restore saved default
    const { lastNotebookId } = await chrome.storage.local.get(['lastNotebookId']);
    if (lastNotebookId) {
      select.value = lastNotebookId;
    }
  } catch (err) {
    console.error('Failed to load notebooks:', err);
  }
}

// --- Load settings ---

async function loadSettings() {
  const result = await chrome.storage.sync.get(['rnotesHost']);
  document.getElementById('host').value = result.rnotesHost || DEFAULT_HOST;

  await updateAuthUI();
  await populateNotebooks();
}

// --- Event handlers ---

// Open rNotes sign-in
document.getElementById('openSigninBtn').addEventListener('click', () => {
  const host = document.getElementById('host').value.replace(/\/+$/, '') || DEFAULT_HOST;
  chrome.tabs.create({ url: `${host}/auth/signin?extension=true` });
});

// Save token
document.getElementById('saveTokenBtn').addEventListener('click', async () => {
  const tokenInput = document.getElementById('tokenInput').value.trim();

  if (!tokenInput) {
    showStatus('Please paste a token', 'error');
    return;
  }

  const claims = decodeToken(tokenInput);
  if (!claims) {
    showStatus('Invalid or expired token', 'error');
    return;
  }

  await chrome.storage.local.set({ encryptid_token: tokenInput });
  document.getElementById('tokenInput').value = '';

  showStatus(`Signed in as ${claims.username || claims.sub}`, 'success');
  await updateAuthUI();
  await populateNotebooks();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['encryptid_token']);
  showStatus('Signed out', 'success');
  await updateAuthUI();
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', async () => {
  const host = document.getElementById('host').value.trim().replace(/\/+$/, '');
  const notebookId = document.getElementById('defaultNotebook').value;

  await chrome.storage.sync.set({ rnotesHost: host || DEFAULT_HOST });
  await chrome.storage.local.set({ lastNotebookId: notebookId });

  showStatus('Settings saved', 'success');
});

// Test connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const host = document.getElementById('host').value.trim().replace(/\/+$/, '') || DEFAULT_HOST;
  const { encryptid_token } = await chrome.storage.local.get(['encryptid_token']);

  try {
    const headers = {};
    if (encryptid_token) {
      headers['Authorization'] = `Bearer ${encryptid_token}`;
    }

    const response = await fetch(`${host}/api/notebooks`, { headers });

    if (response.ok) {
      const data = await response.json();
      showStatus(`Connected! Found ${data.length || 0} notebooks.`, 'success');
    } else if (response.status === 401) {
      showStatus('Connected but not authenticated. Sign in first.', 'error');
    } else {
      showStatus(`Connection failed: ${response.status}`, 'error');
    }
  } catch (err) {
    showStatus(`Cannot connect: ${err.message}`, 'error');
  }
});

// Default notebook change
document.getElementById('defaultNotebook').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ lastNotebookId: e.target.value });
});

// Init
document.addEventListener('DOMContentLoaded', loadSettings);
