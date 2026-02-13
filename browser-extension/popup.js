const DEFAULT_HOST = 'https://rnotes.online';

let currentTab = null;
let selectedText = '';
let selectedHtml = '';

// --- Helpers ---

async function getSettings() {
  const result = await chrome.storage.sync.get(['rnotesHost']);
  return {
    host: result.rnotesHost || DEFAULT_HOST,
  };
}

async function getToken() {
  const result = await chrome.storage.local.get(['encryptid_token']);
  return result.encryptid_token || null;
}

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null; // expired
    }
    return payload;
  } catch {
    return null;
  }
}

function parseTags(tagString) {
  if (!tagString || !tagString.trim()) return [];
  return tagString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status ${type}`;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 3000);
  }
}

// --- API calls ---

async function createNote(data) {
  const token = await getToken();
  const settings = await getSettings();

  const body = {
    title: data.title,
    content: data.content,
    type: data.type || 'CLIP',
    url: data.url,
  };

  const notebookId = document.getElementById('notebook').value;
  if (notebookId) body.notebookId = notebookId;

  const tags = parseTags(document.getElementById('tags').value);
  if (tags.length > 0) body.tags = tags;

  const response = await fetch(`${settings.host}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

async function fetchNotebooks() {
  const token = await getToken();
  const settings = await getSettings();

  const response = await fetch(`${settings.host}/api/notebooks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// --- UI ---

async function populateNotebooks() {
  const select = document.getElementById('notebook');
  try {
    const notebooks = await fetchNotebooks();
    // Keep the "No notebook" option
    for (const nb of notebooks) {
      const option = document.createElement('option');
      option.value = nb.id;
      option.textContent = nb.title;
      select.appendChild(option);
    }

    // Restore last used notebook
    const { lastNotebookId } = await chrome.storage.local.get(['lastNotebookId']);
    if (lastNotebookId) {
      select.value = lastNotebookId;
    }
  } catch (err) {
    console.error('Failed to load notebooks:', err);
  }
}

// Save last used notebook when changed
function setupNotebookMemory() {
  document.getElementById('notebook').addEventListener('change', (e) => {
    chrome.storage.local.set({ lastNotebookId: e.target.value });
  });
}

async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Display page info
  document.getElementById('pageTitle').textContent = tab.title || 'Untitled';
  document.getElementById('pageUrl').textContent = tab.url || '';

  // Check auth
  const token = await getToken();
  const claims = token ? decodeToken(token) : null;

  if (!claims) {
    document.getElementById('userStatus').textContent = 'Not signed in';
    document.getElementById('userStatus').classList.add('not-authed');
    document.getElementById('authWarning').style.display = 'block';
    return;
  }

  document.getElementById('userStatus').textContent = claims.username || claims.sub?.slice(0, 16) || 'Authenticated';
  document.getElementById('authWarning').style.display = 'none';

  // Enable buttons
  document.getElementById('clipPageBtn').disabled = false;

  // Load notebooks
  await populateNotebooks();
  setupNotebookMemory();

  // Detect text selection
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return { text: '', html: '' };
        }
        const range = selection.getRangeAt(0);
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        return { text: selection.toString(), html: div.innerHTML };
      },
    });

    if (result?.result?.text) {
      selectedText = result.result.text;
      selectedHtml = result.result.html;
      document.getElementById('clipSelectionBtn').disabled = false;
    }
  } catch (err) {
    // Can't access some pages (chrome://, etc.)
    console.warn('Cannot access page content:', err);
  }
}

// --- Event handlers ---

document.getElementById('clipPageBtn').addEventListener('click', async () => {
  const btn = document.getElementById('clipPageBtn');
  btn.disabled = true;
  showStatus('Clipping page...', 'loading');

  try {
    // Get page HTML content
    let pageContent = '';
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => document.body.innerHTML,
      });
      pageContent = result?.result || '';
    } catch {
      // Fallback: just use URL as content
      pageContent = `<p>Clipped from <a href="${currentTab.url}">${currentTab.url}</a></p>`;
    }

    const note = await createNote({
      title: currentTab.title || 'Untitled Clip',
      content: pageContent,
      type: 'CLIP',
      url: currentTab.url,
    });

    showStatus(`Clipped! Note saved.`, 'success');

    // Notify background worker
    chrome.runtime.sendMessage({
      type: 'notify',
      title: 'Page Clipped',
      message: `"${currentTab.title}" saved to rNotes`,
    });
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('clipSelectionBtn').addEventListener('click', async () => {
  const btn = document.getElementById('clipSelectionBtn');
  btn.disabled = true;
  showStatus('Clipping selection...', 'loading');

  try {
    const content = selectedHtml || `<p>${selectedText}</p>`;
    const note = await createNote({
      title: `Selection from ${currentTab.title || 'page'}`,
      content: content,
      type: 'CLIP',
      url: currentTab.url,
    });

    showStatus(`Selection clipped!`, 'success');

    chrome.runtime.sendMessage({
      type: 'notify',
      title: 'Selection Clipped',
      message: `Saved to rNotes`,
    });
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('optionsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById('openSettings')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Init on load
document.addEventListener('DOMContentLoaded', init);
