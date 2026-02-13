const DEFAULT_HOST = 'https://rnotes.online';

// --- Context Menu Setup ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page to rNotes',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to rNotes',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save image to rNotes',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'clip-selection',
    title: 'Clip selection to rNotes',
    contexts: ['selection'],
  });
});

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

async function getDefaultNotebook() {
  const result = await chrome.storage.local.get(['lastNotebookId']);
  return result.lastNotebookId || null;
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: title,
    message: message,
  });
}

async function createNote(data) {
  const token = await getToken();
  if (!token) {
    showNotification('rNotes Error', 'Not signed in. Open extension settings to sign in.');
    return;
  }

  const settings = await getSettings();
  const notebookId = await getDefaultNotebook();

  const body = {
    title: data.title,
    content: data.content,
    type: data.type || 'CLIP',
    url: data.url,
  };

  if (notebookId) body.notebookId = notebookId;
  if (data.fileUrl) body.fileUrl = data.fileUrl;
  if (data.mimeType) body.mimeType = data.mimeType;
  if (data.fileSize) body.fileSize = data.fileSize;

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

async function uploadImage(imageUrl) {
  const token = await getToken();
  const settings = await getSettings();

  // Fetch the image
  const imgResponse = await fetch(imageUrl);
  const blob = await imgResponse.blob();

  // Extract filename
  let filename;
  try {
    const urlPath = new URL(imageUrl).pathname;
    filename = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;
  } catch {
    filename = `image-${Date.now()}.jpg`;
  }

  // Upload to rNotes
  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch(`${settings.host}/api/uploads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  return response.json();
}

// --- Context Menu Handler ---

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case 'clip-page': {
        // Get page HTML
        let content = '';
        try {
          const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerHTML,
          });
          content = result?.result || '';
        } catch {
          content = `<p>Clipped from <a href="${tab.url}">${tab.url}</a></p>`;
        }

        await createNote({
          title: tab.title || 'Untitled Clip',
          content: content,
          type: 'CLIP',
          url: tab.url,
        });

        showNotification('Page Clipped', `"${tab.title}" saved to rNotes`);
        break;
      }

      case 'save-link': {
        const linkUrl = info.linkUrl;
        const linkText = info.selectionText || linkUrl;

        await createNote({
          title: linkText,
          content: `<p><a href="${linkUrl}">${linkText}</a></p><p>Found on: <a href="${tab.url}">${tab.title}</a></p>`,
          type: 'BOOKMARK',
          url: linkUrl,
        });

        showNotification('Link Saved', `Bookmark saved to rNotes`);
        break;
      }

      case 'save-image': {
        const imageUrl = info.srcUrl;

        // Upload the image first
        const upload = await uploadImage(imageUrl);

        // Create IMAGE note with file reference
        await createNote({
          title: `Image from ${tab.title || 'page'}`,
          content: `<p><img src="${upload.url}" alt="Clipped image" /></p><p>Source: <a href="${tab.url}">${tab.title}</a></p>`,
          type: 'IMAGE',
          url: tab.url,
          fileUrl: upload.url,
          mimeType: upload.mimeType,
          fileSize: upload.size,
        });

        showNotification('Image Saved', `Image saved to rNotes`);
        break;
      }

      case 'clip-selection': {
        // Get selection HTML
        let content = '';
        try {
          const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const selection = window.getSelection();
              if (!selection || selection.rangeCount === 0) return '';
              const range = selection.getRangeAt(0);
              const div = document.createElement('div');
              div.appendChild(range.cloneContents());
              return div.innerHTML;
            },
          });
          content = result?.result || '';
        } catch {
          content = `<p>${info.selectionText || ''}</p>`;
        }

        if (!content && info.selectionText) {
          content = `<p>${info.selectionText}</p>`;
        }

        await createNote({
          title: `Selection from ${tab.title || 'page'}`,
          content: content,
          type: 'CLIP',
          url: tab.url,
        });

        showNotification('Selection Clipped', `Saved to rNotes`);
        break;
      }
    }
  } catch (err) {
    console.error('Context menu action failed:', err);
    showNotification('rNotes Error', err.message || 'Failed to save');
  }
});

// --- Message Handler (from popup) ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'notify') {
    showNotification(message.title, message.message);
  }
});
