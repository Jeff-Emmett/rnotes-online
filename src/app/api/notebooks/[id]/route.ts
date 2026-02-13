import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed, getNotebookRole } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notebook = await prisma.notebook.findUnique({
      where: { id: params.id },
      include: {
        notes: {
          include: {
            tags: { include: { tag: true } },
          },
          orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        },
        collaborators: {
          include: { user: { select: { id: true, username: true } } },
        },
        _count: { select: { notes: true } },
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Get notebook error:', error);
    return NextResponse.json({ error: 'Failed to get notebook' }, { status: 500 });
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
    const role = await getNotebookRole(user.id, params.id);
    if (!role || role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, coverColor, isPublic } = body;

    const notebook = await prisma.notebook.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(coverColor !== undefined && { coverColor }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Update notebook error:', error);
    return NextResponse.json({ error: 'Failed to update notebook' }, { status: 500 });
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
    const role = await getNotebookRole(user.id, params.id);
    if (role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the owner can delete a notebook' }, { status: 403 });
    }

    await prisma.notebook.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete notebook error:', error);
    return NextResponse.json({ error: 'Failed to delete notebook' }, { status: 500 });
  }
}
