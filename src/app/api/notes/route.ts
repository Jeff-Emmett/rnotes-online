import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { NoteType } from '@prisma/client';
import { requireAuth, isAuthed } from '@/lib/auth';
import { htmlToTipTapJson, tipTapJsonToMarkdown, mapNoteTypeToCardType } from '@/lib/content-convert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    const type = searchParams.get('type');
    const cardType = searchParams.get('cardType');
    const tag = searchParams.get('tag');
    const pinned = searchParams.get('pinned');

    const where: Record<string, unknown> = {
      archivedAt: null, // exclude soft-deleted
    };
    if (notebookId) where.notebookId = notebookId;
    if (type) where.type = type as NoteType;
    if (cardType) where.cardType = cardType;
    if (pinned === 'true') where.isPinned = true;
    if (tag) {
      where.tags = { some: { tag: { name: tag.toLowerCase() } } };
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true, slug: true } },
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true, cardType: true }, where: { archivedAt: null } },
        attachments: { include: { file: true }, orderBy: { position: 'asc' } },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('List notes error:', error);
    return NextResponse.json({ error: 'Failed to list notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;
    const body = await request.json();
    const {
      title, content, type, notebookId, url, archiveUrl, language, tags,
      fileUrl, mimeType, fileSize, duration,
      // Memory Card fields
      parentId, cardType: cardTypeOverride, visibility, properties, summary, position, bodyJson: clientBodyJson,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const contentPlain = content ? stripHtml(content) : null;

    // Dual-write: compute bodyJson + bodyMarkdown
    let bodyJson = clientBodyJson || null;
    let bodyMarkdown: string | null = null;
    let bodyFormat = 'html';

    if (clientBodyJson) {
      // Client sent TipTap JSON — it's canonical
      bodyJson = clientBodyJson;
      bodyMarkdown = tipTapJsonToMarkdown(clientBodyJson);
      bodyFormat = 'blocks';
    } else if (content) {
      // HTML content — convert to JSON + markdown
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
        title: title.trim(),
        content: content || '',
        contentPlain,
        type: noteType,
        notebookId: notebookId || null,
        authorId: user.id,
        url: url || null,
        archiveUrl: archiveUrl || null,
        language: language || null,
        fileUrl: fileUrl || null,
        mimeType: mimeType || null,
        fileSize: fileSize || null,
        duration: duration || null,
        // Memory Card fields
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
        notebook: { select: { id: true, title: true, slug: true } },
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
