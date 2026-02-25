import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWorkspaceSlug } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const type = searchParams.get('type');
    const cardType = searchParams.get('cardType');
    const notebookId = searchParams.get('notebookId');
    const workspaceSlug = getWorkspaceSlug();

    if (!q) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    // Build WHERE clauses for optional filters
    const filters: string[] = ['n."archivedAt" IS NULL'];
    const params: (string | null)[] = [q]; // $1 = search query

    if (type) {
      params.push(type);
      filters.push(`n."type" = $${params.length}::"NoteType"`);
    }
    if (cardType) {
      params.push(cardType);
      filters.push(`n."cardType" = $${params.length}`);
    }
    if (notebookId) {
      params.push(notebookId);
      filters.push(`n."notebookId" = $${params.length}`);
    }

    // Workspace boundary: only search within the current workspace's notebooks
    if (workspaceSlug) {
      params.push(workspaceSlug);
      filters.push(`nb."workspaceSlug" = $${params.length}`);
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    // Full-text search — prefer bodyMarkdown over contentPlain
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      title: string;
      content: string;
      contentPlain: string | null;
      bodyMarkdown: string | null;
      type: string;
      cardType: string;
      notebookId: string | null;
      notebookTitle: string | null;
      isPinned: boolean;
      summary: string | null;
      updatedAt: Date;
      rank: number;
      headline: string | null;
    }>>(
      `SELECT
        n.id,
        n.title,
        n.content,
        n."contentPlain",
        n."bodyMarkdown",
        n.type::"text" as type,
        n."cardType",
        n."notebookId",
        nb.title as "notebookTitle",
        n."isPinned",
        n.summary,
        n."updatedAt",
        ts_rank(
          to_tsvector('english', COALESCE(n."bodyMarkdown", n."contentPlain", '') || ' ' || n.title),
          plainto_tsquery('english', $1)
        ) as rank,
        ts_headline('english',
          COALESCE(n."bodyMarkdown", n."contentPlain", n.content, ''),
          plainto_tsquery('english', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=1'
        ) as headline
      FROM "Note" n
      LEFT JOIN "Notebook" nb ON n."notebookId" = nb.id
      WHERE (
        to_tsvector('english', COALESCE(n."bodyMarkdown", n."contentPlain", '') || ' ' || n.title) @@ plainto_tsquery('english', $1)
        OR n.title ILIKE '%' || $1 || '%'
        OR n."bodyMarkdown" ILIKE '%' || $1 || '%'
        OR n."contentPlain" ILIKE '%' || $1 || '%'
      )
      ${whereClause}
      ORDER BY rank DESC, n."updatedAt" DESC
      LIMIT 50`,
      ...params
    );

    // Fetch tags for matched notes
    const noteIds = results.map((r) => r.id);
    const noteTags = noteIds.length > 0
      ? await prisma.noteTag.findMany({
          where: { noteId: { in: noteIds } },
          include: { tag: true },
        })
      : [];

    const tagsByNoteId = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
    for (const nt of noteTags) {
      const arr = tagsByNoteId.get(nt.noteId) || [];
      arr.push({ id: nt.tag.id, name: nt.tag.name, color: nt.tag.color });
      tagsByNoteId.set(nt.noteId, arr);
    }

    const response = results.map((note) => ({
      id: note.id,
      title: note.title,
      snippet: note.summary || note.headline || (note.bodyMarkdown || note.contentPlain || note.content || '').slice(0, 150),
      type: note.type,
      cardType: note.cardType,
      notebookId: note.notebookId,
      notebookTitle: note.notebookTitle,
      updatedAt: new Date(note.updatedAt).toISOString(),
      tags: tagsByNoteId.get(note.id) || [],
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search notes error:', error);
    return NextResponse.json({ error: 'Failed to search notes' }, { status: 500 });
  }
}
