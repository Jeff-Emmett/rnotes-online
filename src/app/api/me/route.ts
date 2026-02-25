/**
 * /api/me — Returns current user's auth status.
 *
 * Checks for EncryptID token in Authorization header or cookie,
 * then verifies it against the EncryptID server.
 */

import { NextRequest, NextResponse } from 'next/server';

const ENCRYPTID_URL = process.env.ENCRYPTID_URL || 'https://auth.ridentity.online';

export async function GET(req: NextRequest) {
  // Extract token from Authorization header or cookie
  const auth = req.headers.get('Authorization');
  let token: string | null = null;

  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    const tokenCookie = req.cookies.get('encryptid_token');
    if (tokenCookie) token = tokenCookie.value;
  }

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const res = await fetch(`${ENCRYPTID_URL}/api/session/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ authenticated: false });
    }

    const data = await res.json();
    if (data.valid) {
      return NextResponse.json({
        authenticated: true,
        user: {
          username: data.username || null,
          did: data.did || data.userId || null,
        },
      });
    }

    return NextResponse.json({ authenticated: false });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
