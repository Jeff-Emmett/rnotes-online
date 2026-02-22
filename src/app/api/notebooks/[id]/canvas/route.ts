import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pushShapesToCanvas } from '@/lib/canvas-sync';
import { requireAuth, isAuthed, getNotebookRole } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;
    const role = await getNotebookRole(user.id, params.id);
    if (!role || role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notebook = await prisma.notebook.findUnique({
      where: { id: params.id },
      include: {
        notes: {
          where: { archivedAt: null },
          include: {
            tags: { include: { tag: true } },
            children: { select: { id: true }, where: { archivedAt: null } },
            attachments: { select: { id: true } },
          },
          orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const canvasSlug = notebook.canvasSlug || notebook.slug;
    const shapes: Record<string, unknown>[] = [];

    // Notebook shape (top-left)
    shapes.push({
      type: 'folk-notebook',
      x: 50,
      y: 50,
      width: 350,
      height: 300,
      notebookTitle: notebook.title,
      description: notebook.description || '',
      noteCount: notebook.notes.length,
      coverColor: notebook.coverColor,
      notebookId: notebook.id,
    });

    // Note shapes (grid layout, 4 columns)
    const colWidth = 320;
    const rowHeight = 220;
    const cols = 4;
    const startX = 450;
    const startY = 50;

    notebook.notes.forEach((note, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      shapes.push({
        type: 'folk-note',
        x: startX + col * colWidth,
        y: startY + row * rowHeight,
        width: 300,
        height: 200,
        noteTitle: note.title,
        noteType: note.type,
        snippet: (note.contentPlain || note.content || '').slice(0, 200),
        url: note.url || '',
        tags: note.tags.map((nt) => nt.tag.name),
        noteId: note.id,
        // Memory Card enrichments
        cardType: note.cardType,
        summary: note.summary || '',
        visibility: note.visibility,
        properties: note.properties || {},
        parentId: note.parentId || '',
        hasChildren: note.children.length > 0,
        childCount: note.children.length,
        attachmentCount: note.attachments.length,
      });
    });

    await pushShapesToCanvas(canvasSlug, shapes);

    if (!notebook.canvasSlug) {
      await prisma.notebook.update({
        where: { id: notebook.id },
        data: { canvasSlug },
      });
    }

    return NextResponse.json({
      canvasSlug,
      shapesCreated: shapes.length,
      canvasUrl: `https://${canvasSlug}.rspace.online`,
    });
  } catch (error) {
    console.error('Create canvas error:', error);
    return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 });
  }
}
