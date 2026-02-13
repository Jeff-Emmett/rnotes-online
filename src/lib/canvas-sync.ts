/**
 * Canvas sync utilities for rnotes.online <-> rspace.online integration
 */

export interface CanvasShapeMessage {
  source: 'rspace-canvas';
  type: 'shape-updated' | 'shape-deleted';
  communitySlug: string;
  shapeId: string;
  data: Record<string, unknown>;
}

export function isCanvasMessage(event: MessageEvent): event is MessageEvent<CanvasShapeMessage> {
  return event.data?.source === 'rspace-canvas';
}

/**
 * Push shapes to an rspace canvas community via the shapes API
 */
export async function pushShapesToCanvas(
  canvasSlug: string,
  shapes: Record<string, unknown>[],
  rspaceUrl?: string
): Promise<void> {
  const baseUrl = rspaceUrl || process.env.RSPACE_INTERNAL_URL || 'http://rspace-online:3000';

  const response = await fetch(`${baseUrl}/api/communities/${canvasSlug}/shapes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shapes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to push shapes: ${response.status} ${text}`);
  }
}
