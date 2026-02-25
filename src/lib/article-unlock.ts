/**
 * Article Unlock — multi-strategy approach to get readable versions of
 * paywalled or permissioned articles.
 *
 * Strategies (tried in order):
 * 1. Wayback Machine — check for existing snapshot, or request a new one
 * 2. Google Web Cache — fast lookup, often has full text
 * 3. archive.ph — check for existing snapshots (read-only, no submission)
 */

export interface UnlockResult {
  success: boolean;
  strategy: string;
  archiveUrl?: string;
  content?: string;
  error?: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Strategy 1: Internet Archive Wayback Machine
// ---------------------------------------------------------------------------

async function tryWaybackMachine(url: string): Promise<UnlockResult | null> {
  // First check if a snapshot already exists
  try {
    const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const res = await fetch(checkUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      const snapshot = data?.archived_snapshots?.closest;
      if (snapshot?.available && snapshot?.url) {
        return {
          success: true,
          strategy: 'wayback',
          archiveUrl: snapshot.url.replace('http://', 'https://'),
        };
      }
    }
  } catch {
    // availability check failed, try Save Page Now
  }

  // No existing snapshot — request one via Save Page Now (SPN)
  try {
    const saveRes = await fetch('https://web.archive.org/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
      },
      body: `url=${encodeURIComponent(url)}&capture_all=1`,
      signal: AbortSignal.timeout(30000),
    });

    if (saveRes.ok) {
      const data = await saveRes.json();
      // SPN returns a job_id — we can construct the URL
      if (data.url) {
        return {
          success: true,
          strategy: 'wayback-save',
          archiveUrl: data.url,
        };
      }
      if (data.job_id) {
        // Poll for completion (up to 30s)
        const archiveUrl = await pollWaybackJob(data.job_id);
        if (archiveUrl) {
          return { success: true, strategy: 'wayback-save', archiveUrl };
        }
      }
    }

    // Sometimes SPN redirects to the archived page directly
    if (saveRes.status === 302 || saveRes.status === 301) {
      const location = saveRes.headers.get('location');
      if (location) {
        return { success: true, strategy: 'wayback-save', archiveUrl: location };
      }
    }
  } catch {
    // SPN failed
  }

  return null;
}

async function pollWaybackJob(jobId: string): Promise<string | null> {
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(`https://web.archive.org/save/status/${jobId}`, {
        headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.original_url && data.timestamp) {
          return `https://web.archive.org/web/${data.timestamp}/${data.original_url}`;
        }
        if (data.status === 'error') return null;
      }
    } catch {
      // keep polling
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: Google Web Cache
// ---------------------------------------------------------------------------

async function tryGoogleCache(url: string): Promise<UnlockResult | null> {
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
  try {
    const res = await fetch(cacheUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      // Google cache returns the full page — verify it's not an error page
      const text = await res.text();
      if (text.length > 1000 && !text.includes('did not match any documents')) {
        return {
          success: true,
          strategy: 'google-cache',
          archiveUrl: cacheUrl,
          content: text,
        };
      }
    }
  } catch {
    // Google cache not available
  }

  return null;
}

// ---------------------------------------------------------------------------
// Strategy 3: archive.ph (read-only — check for existing snapshots)
// ---------------------------------------------------------------------------

async function tryArchivePh(url: string): Promise<UnlockResult | null> {
  // Only check if an archive already exists — do NOT submit new pages
  // (archive.ph has no API and aggressive anti-bot + security concerns)
  const checkUrl = `https://archive.ph/newest/${encodeURIComponent(url)}`;
  try {
    const res = await fetch(checkUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      redirect: 'manual', // archive.ph redirects to the snapshot
      signal: AbortSignal.timeout(10000),
    });

    // A 302 redirect means a snapshot exists
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location');
      if (location && location.includes('archive.ph/') && !location.includes('/submit')) {
        return {
          success: true,
          strategy: 'archive-ph',
          archiveUrl: location,
        };
      }
    }

    // A 200 with content also means it found one
    if (res.ok) {
      const finalUrl = res.url;
      if (finalUrl && finalUrl !== checkUrl && finalUrl.includes('archive.ph/')) {
        return {
          success: true,
          strategy: 'archive-ph',
          archiveUrl: finalUrl,
        };
      }
    }
  } catch {
    // archive.ph not reachable
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main unlock function
// ---------------------------------------------------------------------------

export async function unlockArticle(url: string): Promise<UnlockResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    return { success: false, strategy: 'none', error: 'Invalid URL' };
  }

  // Try strategies in order of reliability
  const strategies = [
    { name: 'Wayback Machine', fn: tryWaybackMachine },
    { name: 'Google Cache', fn: tryGoogleCache },
    { name: 'archive.ph', fn: tryArchivePh },
  ];

  const errors: string[] = [];

  for (const { name, fn } of strategies) {
    try {
      const result = await fn(url);
      if (result?.success) {
        return result;
      }
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return {
    success: false,
    strategy: 'none',
    error: `No archived version found. Tried: ${strategies.map((s) => s.name).join(', ')}`,
  };
}
