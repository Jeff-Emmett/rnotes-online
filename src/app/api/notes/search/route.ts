import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const type = searchParams.get('type');
    const notebookId = searchParams.get('notebookId');

    if (!q) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    // Use Prisma contains for search (works without GIN index)
    // Can upgrade to raw SQL full-text search once GIN index is in place
    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { contentPlain: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (type) where.type = type;
    if (notebookId) where.notebookId = notebookId;

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const results = notes.map((note) => {
      // Build snippet from contentPlain
      const plain = note.contentPlain || note.content || '';
      const idx = plain.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 50);
      const end = Math.min(plain.length, idx + q.length + 100);
      const snippet = (start > 0 ? '...' : '') + plain.slice(start, end) + (end < plain.length ? '...' : '');

      return {
        id: note.id,
        title: note.title,
        snippet,
        type: note.type,
        notebookId: note.notebookId,
        notebookTitle: note.notebook?.title || null,
        updatedAt: note.updatedAt.toISOString(),
        tags: note.tags.map((nt) => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color,
        })),
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search notes error:', error);
    return NextResponse.json({ error: 'Failed to search notes' }, { status: 500 });
  }
}
