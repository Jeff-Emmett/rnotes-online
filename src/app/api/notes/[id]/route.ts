import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';

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
    const body = await request.json();
    const { title, content, type, url, language, isPinned, notebookId, tags } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) {
      data.content = content;
      data.contentPlain = stripHtml(content);
    }
    if (type !== undefined) data.type = type;
    if (url !== undefined) data.url = url || null;
    if (language !== undefined) data.language = language || null;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (notebookId !== undefined) data.notebookId = notebookId || null;

    // Handle tag updates: replace all tags
    if (tags !== undefined && Array.isArray(tags)) {
      // Delete existing tag links
      await prisma.noteTag.deleteMany({ where: { noteId: params.id } });

      // Find or create tags and link
      for (const tagName of tags) {
        const name = tagName.trim().toLowerCase();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
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
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.note.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
