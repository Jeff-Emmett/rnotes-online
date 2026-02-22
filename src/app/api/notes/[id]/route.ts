import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { requireAuth, isAuthed } from '@/lib/auth';
import { htmlToTipTapJson, tipTapJsonToHtml, tipTapJsonToMarkdown, mapNoteTypeToCardType } from '@/lib/content-convert';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true, slug: true } },
        author: { select: { id: true, username: true } },
        parent: { select: { id: true, title: true, cardType: true } },
        children: {
          select: { id: true, title: true, cardType: true },
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
        attachments: {
          include: { file: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    return NextResponse.json({ error: 'Failed to get note' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const existing = await prisma.note.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (existing.authorId && existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, content, type, url, language, isPinned, notebookId, tags,
      // Memory Card fields
      parentId, cardType, visibility, properties, summary, position,
      bodyJson: clientBodyJson,
    } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (type !== undefined) data.type = type;
    if (url !== undefined) data.url = url || null;
    if (language !== undefined) data.language = language || null;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (notebookId !== undefined) data.notebookId = notebookId || null;

    // Memory Card field updates
    if (parentId !== undefined) data.parentId = parentId || null;
    if (cardType !== undefined) data.cardType = cardType;
    if (visibility !== undefined) data.visibility = visibility;
    if (properties !== undefined) data.properties = properties;
    if (summary !== undefined) data.summary = summary || null;
    if (position !== undefined) data.position = position;

    // Dual-write: if client sends bodyJson, it's canonical
    if (clientBodyJson) {
      data.bodyJson = clientBodyJson;
      data.content = tipTapJsonToHtml(clientBodyJson);
      data.bodyMarkdown = tipTapJsonToMarkdown(clientBodyJson);
      data.contentPlain = stripHtml(data.content as string);
      data.bodyFormat = 'blocks';
    } else if (content !== undefined) {
      // HTML content — compute all derived formats
      data.content = content;
      data.contentPlain = stripHtml(content);
      const json = htmlToTipTapJson(content);
      data.bodyJson = json;
      data.bodyMarkdown = tipTapJsonToMarkdown(json);
    }

    // If type changed, update cardType too (unless explicitly set)
    if (type !== undefined && cardType === undefined) {
      data.cardType = mapNoteTypeToCardType(type);
    }

    // Handle tag updates: replace all tags
    if (tags !== undefined && Array.isArray(tags)) {
      await prisma.noteTag.deleteMany({ where: { noteId: params.id } });

      for (const tagName of tags) {
        const name = tagName.trim().toLowerCase();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: { spaceId_name: { spaceId: '', name } },
          update: {},
          create: { name, spaceId: '' },
        });
        await prisma.noteTag.create({
          data: { noteId: params.id, tagId: tag.id },
        });
      }
    }

    const note = await prisma.note.update({
      where: { id: params.id },
      data,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true, slug: true } },
        parent: { select: { id: true, title: true, cardType: true } },
        children: {
          select: { id: true, title: true, cardType: true },
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
        },
        attachments: {
          include: { file: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const existing = await prisma.note.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (existing.authorId && existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft-delete: set archivedAt instead of deleting
    await prisma.note.update({
      where: { id: params.id },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
