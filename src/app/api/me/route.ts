import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getWorkspaceSlug } from '@/lib/workspace';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const workspaceSlug = getWorkspaceSlug();

    if (!auth) {
      return NextResponse.json({
        authenticated: false,
        workspace: workspaceSlug || null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        username: auth.user.username,
        did: auth.did,
      },
      workspace: workspaceSlug || null,
    });
  } catch {
    return NextResponse.json({ authenticated: false, workspace: null });
  }
}
