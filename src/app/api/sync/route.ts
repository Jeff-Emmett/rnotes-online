import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/sync
 *
 * Receives shape update events from the rSpace canvas (via postMessage → CanvasEmbed → fetch)
 * and updates the corresponding DB records.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shapeId, type, data } = body;

    if (!shapeId || !type) {
      return NextResponse.json({ error: 'Missing shapeId or type' }, { status: 400 });
    }

    const shapeType = data?.type as string | undefined;

    if (type === 'shape-deleted') {
      // Clear canvasShapeId references (don't delete the DB record)
      await Promise.all([
        prisma.note.updateMany({
          where: { canvasShapeId: shapeId },
          data: { canvasShapeId: null },
        }),
        prisma.notebook.updateMany({
          where: { canvasShapeId: shapeId },
          data: { canvasShapeId: null },
        }),
      ]);

      return NextResponse.json({ ok: true, action: 'unlinked' });
    }

    // shape-updated: try to match and update
    if (shapeType === 'folk-note') {
      const note = await prisma.note.findFirst({
        where: { canvasShapeId: shapeId },
      });

      if (note) {
        await prisma.note.update({
          where: { id: note.id },
          data: {
            title: (data.noteTitle as string) || note.title,
          },
        });
        return NextResponse.json({ ok: true, action: 'updated', entity: 'note', id: note.id });
      }
    }

    if (shapeType === 'folk-notebook') {
      const notebook = await prisma.notebook.findFirst({
        where: { canvasShapeId: shapeId },
      });

      if (notebook) {
        await prisma.notebook.update({
          where: { id: notebook.id },
          data: {
            title: (data.notebookTitle as string) || notebook.title,
            description: (data.description as string) ?? notebook.description,
          },
        });
        return NextResponse.json({ ok: true, action: 'updated', entity: 'notebook', id: notebook.id });
      }
    }

    return NextResponse.json({ ok: true, action: 'no-match' });
  } catch (error) {
    console.error('Canvas sync error:', error);
    return NextResponse.json({ error: 'Failed to sync canvas update' }, { status: 500 });
  }
}
