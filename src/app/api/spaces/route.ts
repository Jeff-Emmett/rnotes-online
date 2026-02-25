import { NextResponse } from 'next/server';

/**
 * GET /api/spaces — List spaces available to the current user.
 * Proxies to rSpace API when available, otherwise returns empty list.
 */
export async function GET(request: Request) {
  const rspaceUrl = process.env.RSPACE_INTERNAL_URL || process.env.NEXT_PUBLIC_RSPACE_URL;

  if (!rspaceUrl) {
    return NextResponse.json({ spaces: [] });
  }

  try {
    // Forward auth header to rSpace
    const authHeader = request.headers.get('Authorization');
    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${rspaceUrl}/api/spaces`, {
      headers,
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // rSpace not reachable
  }

  return NextResponse.json({ spaces: [] });
}
