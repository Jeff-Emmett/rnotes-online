/**
 * Spaces API proxy — forwards to rSpace (the canonical spaces authority).
 *
 * Every r*App proxies /api/spaces to rSpace so the SpaceSwitcher dropdown
 * shows the same spaces everywhere. The EncryptID token is forwarded so
 * rSpace can return user-specific spaces (owned/member).
 */

import { NextRequest, NextResponse } from 'next/server';

const RSPACE_API = process.env.RSPACE_API_URL || 'https://rspace.online';

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {};

  // Forward the EncryptID token (from Authorization header or cookie)
  const auth = req.headers.get('Authorization');
  if (auth) {
    headers['Authorization'] = auth;
  } else {
    // Fallback: check for encryptid_token cookie
    const tokenCookie = req.cookies.get('encryptid_token');
    if (tokenCookie) {
      headers['Authorization'] = `Bearer ${tokenCookie.value}`;
    }
  }

  try {
    const res = await fetch(`${RSPACE_API}/api/spaces`, {
      headers,
      next: { revalidate: 30 }, // cache for 30s to avoid hammering rSpace
    });

    if (!res.ok) {
      // If rSpace is down, return empty spaces (graceful degradation)
      return NextResponse.json({ spaces: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // rSpace unreachable — return empty list
    return NextResponse.json({ spaces: [] });
  }
}
