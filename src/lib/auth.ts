import { getEncryptIDSession } from '@encryptid/sdk/server/nextjs';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getWorkspaceSlug } from './workspace';
import type { User } from '@prisma/client';

export interface AuthResult {
  user: User;
  did: string;
  username: string | null;
}

const UNAUTHORIZED = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

/**
 * Get authenticated user from request, or null if not authenticated.
 * Upserts User in DB by DID (find-or-create).
 * On first user creation, auto-claims orphaned notebooks/notes.
 * Auto-migrates unscoped notebooks to user's workspace.
 */
export async function getAuthUser(request: Request): Promise<AuthResult | null> {
  const claims = await getEncryptIDSession(request);
  if (!claims) return null;

  const did = claims.did || claims.sub;
  if (!did) return null;

  // Upsert user by DID
  const user = await prisma.user.upsert({
    where: { did },
    update: { username: claims.username || undefined },
    create: { did, username: claims.username || null },
  });

  // First-user auto-claim: if this is the only user, claim orphaned resources
  const userCount = await prisma.user.count();
  if (userCount === 1) {
    // Claim notebooks with no collaborators
    const orphanedNotebooks = await prisma.notebook.findMany({
      where: { collaborators: { none: {} } },
      select: { id: true },
    });
    if (orphanedNotebooks.length > 0) {
      await prisma.notebookCollaborator.createMany({
        data: orphanedNotebooks.map((nb) => ({
          userId: user.id,
          notebookId: nb.id,
          role: 'OWNER' as const,
        })),
        skipDuplicates: true,
      });
    }

    // Claim notes with no author
    await prisma.note.updateMany({
      where: { authorId: null },
      data: { authorId: user.id },
    });
  }

  // Auto-migrate: assign unscoped notebooks owned by this user to their workspace
  if (user.username) {
    const workspaceSlug = user.username.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await prisma.notebook.updateMany({
      where: {
        workspaceSlug: '',
        collaborators: {
          some: { userId: user.id, role: 'OWNER' },
        },
      },
      data: { workspaceSlug },
    });
  }

  return { user, did, username: user.username };
}

/**
 * Require authentication. Returns auth result or a 401 NextResponse.
 * Callers should check: `if (auth instanceof NextResponse) return auth;`
 */
export async function requireAuth(request: Request): Promise<AuthResult | NextResponse> {
  const result = await getAuthUser(request);
  if (!result) return UNAUTHORIZED;
  return result;
}

/** Type guard for successful auth */
export function isAuthed(result: AuthResult | NextResponse): result is AuthResult {
  return !(result instanceof NextResponse);
}

/**
 * Check if user has a role on a notebook (OWNER, EDITOR, or VIEWER).
 * Returns the role or null if no access.
 */
export async function getNotebookRole(
  userId: string,
  notebookId: string
): Promise<'OWNER' | 'EDITOR' | 'VIEWER' | null> {
  const collab = await prisma.notebookCollaborator.findUnique({
    where: { userId_notebookId: { userId, notebookId } },
  });
  return collab?.role ?? null;
}
