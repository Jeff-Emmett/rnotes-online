import { headers } from 'next/headers';

/**
 * Get the current workspace slug from the request.
 * Returns the subdomain (e.g. "jeff" from "jeff.rnotes.online") or "" for bare domain.
 */
export function getWorkspaceSlug(): string {
  const h = headers();
  return h.get('x-workspace-slug') || '';
}
