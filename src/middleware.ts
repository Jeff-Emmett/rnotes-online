import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SUBDOMAINS = new Set(['www', 'opennotebook', 'api']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const match = host.match(/^([a-z0-9-]+)\.rnotes\.online$/);

  if (match && !RESERVED_SUBDOMAINS.has(match[1])) {
    const space = match[1];
    const response = NextResponse.next();
    response.cookies.set('rnotes-space', space, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
