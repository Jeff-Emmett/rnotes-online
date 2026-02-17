/**
 * Space Role bridge for rNotes
 *
 * Bridges EncryptID session + notebook-level collaborator roles
 * with the unified SpaceRole system. When a notebook is linked to
 * a canvas space (via canvasSlug), cross-module membership is
 * resolved from the EncryptID server.
 */

import { prisma } from './prisma';
import { getAuthUser, type AuthResult } from './auth';
import {
  SpaceRole,
  hasCapability,
  type ResolvedRole,
} from '@encryptid/sdk/types';
import { RNOTES_PERMISSIONS } from '@encryptid/sdk/types/modules';

const ENCRYPTID_SERVER = process.env.ENCRYPTID_SERVER_URL || 'https://encryptid.jeffemmett.com';

// In-memory cache (5 minute TTL)
const roleCache = new Map<string, { role: ResolvedRole; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Map rNotes CollaboratorRole to SpaceRole.
 */
function notebookRoleToSpaceRole(role: string): SpaceRole {
  switch (role) {
    case 'OWNER':
      return SpaceRole.ADMIN;
    case 'EDITOR':
      return SpaceRole.PARTICIPANT;
    case 'VIEWER':
      return SpaceRole.VIEWER;
    default:
      return SpaceRole.VIEWER;
  }
}

/**
 * Resolve a user's SpaceRole for a given notebook.
 *
 * Resolution order:
 * 1. Check local notebook collaborator role → map to SpaceRole
 * 2. If notebook is linked to a canvas space (canvasSlug), check EncryptID membership
 * 3. If notebook is public, default to VIEWER
 * 4. Otherwise VIEWER
 */
export async function resolveNotebookSpaceRole(
  userId: string,
  notebookId: string,
): Promise<ResolvedRole> {
  const cacheKey = `${userId}:${notebookId}`;
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.role;
  }

  // Check local notebook collaborator role
  const collab = await prisma.notebookCollaborator.findUnique({
    where: { userId_notebookId: { userId, notebookId } },
  });

  if (collab) {
    const result: ResolvedRole = {
      role: notebookRoleToSpaceRole(collab.role),
      source: collab.role === 'OWNER' ? 'owner' : 'membership',
    };
    roleCache.set(cacheKey, { role: result, expires: Date.now() + CACHE_TTL });
    return result;
  }

  // Check if notebook is linked to a canvas space
  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    select: { canvasSlug: true, isPublic: true },
  });

  if (notebook?.canvasSlug) {
    // Look up user's DID for cross-module membership check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.did) {
      try {
        const url = `${ENCRYPTID_SERVER}/api/spaces/${encodeURIComponent(notebook.canvasSlug)}/members/${encodeURIComponent(user.did)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as { role: string };
          const result: ResolvedRole = { role: data.role as SpaceRole, source: 'membership' };
          roleCache.set(cacheKey, { role: result, expires: Date.now() + CACHE_TTL });
          return result;
        }
      } catch {
        // Network error — fall through to defaults
      }
    }
  }

  // Default: public notebooks get VIEWER, otherwise no access
  const isPublic = notebook?.isPublic ?? false;
  const result: ResolvedRole = {
    role: isPublic ? SpaceRole.VIEWER : SpaceRole.VIEWER,
    source: 'default',
  };
  roleCache.set(cacheKey, { role: result, expires: Date.now() + CACHE_TTL });
  return result;
}

/**
 * Check if a user has a specific rNotes capability on a notebook.
 */
export async function checkNotesCapability(
  userId: string,
  notebookId: string,
  capability: keyof typeof RNOTES_PERMISSIONS.capabilities,
): Promise<boolean> {
  const resolved = await resolveNotebookSpaceRole(userId, notebookId);
  return hasCapability(resolved.role, capability, RNOTES_PERMISSIONS);
}

/**
 * Resolve SpaceRole from a request + notebook context.
 * Convenience wrapper for API routes.
 */
export async function resolveRequestSpaceRole(
  request: Request,
  notebookId: string,
): Promise<{ auth: AuthResult; resolved: ResolvedRole } | null> {
  const auth = await getAuthUser(request);
  if (!auth) return null;

  const resolved = await resolveNotebookSpaceRole(auth.user.id, notebookId);
  return { auth, resolved };
}

/**
 * Invalidate cached role for a user on a notebook.
 */
export function invalidateNotesRoleCache(userId?: string, notebookId?: string): void {
  if (userId && notebookId) {
    roleCache.delete(`${userId}:${notebookId}`);
  } else {
    roleCache.clear();
  }
}
