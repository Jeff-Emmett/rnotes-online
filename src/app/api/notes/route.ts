import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';
import { NoteType } from '@prisma/client';
import { requireAuth, isAuthed } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');
    const pinned = searchParams.get('pinned');

    const where: Record<string, unknown> = {};
    if (notebookId) where.notebookId = notebookId;
    if (type) where.type = type as NoteType;
    if (pinned === 'true') where.isPinned = true;
    if (tag) {
      where.tags = { some: { tag: { name: tag.toLowerCase() } } };
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true, slug: true } },
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
    const { title, content, type, notebookId, url, language, tags, fileUrl, mimeType, fileSize } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const contentPlain = content ? stripHtml(content) : null;

    // Find or create tags
    const tagRecords = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const name = tagName.trim().toLowerCase();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        tagRecords.push(tag);
      }
    }

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content || '',
        contentPlain,
        type: type || 'NOTE',
        notebookId: notebookId || null,
        authorId: user.id,
        url: url || null,
        language: language || null,
        fileUrl: fileUrl || null,
        mimeType: mimeType || null,
        fileSize: fileSize || null,
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
