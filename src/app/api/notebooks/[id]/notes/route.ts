import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { requireAuth, isAuthed, getNotebookRole } from '@/lib/auth';
import { htmlToTipTapJson, tipTapJsonToMarkdown, mapNoteTypeToCardType } from '@/lib/content-convert';
import { getWorkspaceSlug } from '@/lib/workspace';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceSlug = getWorkspaceSlug();

    // Verify notebook belongs to current workspace
    if (workspaceSlug) {
      const notebook = await prisma.notebook.findUnique({
        where: { id: params.id },
        select: { workspaceSlug: true },
      });
      if (!notebook || notebook.workspaceSlug !== workspaceSlug) {
        return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
      }
    }

    const notes = await prisma.note.findMany({
      where: { notebookId: params.id, archivedAt: null },
      include: {
        tags: { include: { tag: true } },
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true, cardType: true }, where: { archivedAt: null } },
        attachments: { include: { file: true }, orderBy: { position: 'asc' } },
      },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('List notebook notes error:', error);
    return NextResponse.json({ error: 'Failed to list notes' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const {
      title, content, type, url, language, tags, fileUrl, mimeType, fileSize, duration,
      parentId, cardType: cardTypeOverride, visibility, properties, summary, position, bodyJson: clientBodyJson,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const contentPlain = content ? stripHtml(content) : null;

    // Dual-write
    let bodyJson = clientBodyJson || null;
    let bodyMarkdown: string | null = null;
    let bodyFormat = 'html';

    if (clientBodyJson) {
      bodyJson = clientBodyJson;
      bodyMarkdown = tipTapJsonToMarkdown(clientBodyJson);
      bodyFormat = 'blocks';
    } else if (content) {
      bodyJson = htmlToTipTapJson(content);
      bodyMarkdown = tipTapJsonToMarkdown(bodyJson);
    }

    const noteType = type || 'NOTE';
    const resolvedCardType = cardTypeOverride || mapNoteTypeToCardType(noteType);

    // Find or create tags
    const tagRecords = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const name = tagName.trim().toLowerCase();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: { spaceId_name: { spaceId: '', name } },
          update: {},
          create: { name, spaceId: '' },
        });
        tagRecords.push(tag);
      }
    }

    const note = await prisma.note.create({
      data: {
        notebookId: params.id,
        authorId: user.id,
        title: title.trim(),
        content: content || '',
        contentPlain,
        type: noteType,
        url: url || null,
        language: language || null,
        fileUrl: fileUrl || null,
        mimeType: mimeType || null,
        fileSize: fileSize || null,
        duration: duration || null,
        bodyJson: bodyJson || undefined,
        bodyMarkdown,
        bodyFormat,
        cardType: resolvedCardType,
        parentId: parentId || null,
        visibility: visibility || 'private',
        properties: properties || {},
        summary: summary || null,
        position: position ?? null,
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true, cardType: true }, where: { archivedAt: null } },
        attachments: { include: { file: true }, orderBy: { position: 'asc' } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
