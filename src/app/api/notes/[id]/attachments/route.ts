import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attachments = await prisma.cardAttachment.findMany({
      where: { noteId: params.id },
      include: { file: true },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('List attachments error:', error);
    return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;

    const body = await request.json();
    const { fileId, role, caption, position } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Verify note exists
    const note = await prisma.note.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Verify file exists
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const attachment = await prisma.cardAttachment.upsert({
      where: { noteId_fileId: { noteId: params.id, fileId } },
      update: {
        role: role || 'supporting',
        caption: caption || null,
        position: position ?? 0,
      },
      create: {
        noteId: params.id,
        fileId,
        role: role || 'supporting',
        caption: caption || null,
        position: position ?? 0,
      },
      include: { file: true },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Create attachment error:', error);
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId query parameter required' }, { status: 400 });
    }

    await prisma.cardAttachment.delete({
      where: { noteId_fileId: { noteId: params.id, fileId } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
