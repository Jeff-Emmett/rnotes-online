import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtml } from '@/lib/strip-html';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notes = await prisma.note.findMany({
      where: { notebookId: params.id },
      include: {
        tags: { include: { tag: true } },
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
    const body = await request.json();
    const { title, content, type, url, language, tags, fileUrl, mimeType, fileSize } = body;

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
        notebookId: params.id,
        title: title.trim(),
        content: content || '',
        contentPlain,
        type: type || 'NOTE',
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
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
