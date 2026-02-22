import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const children = await prisma.note.findMany({
      where: { parentId: params.id, archivedAt: null },
      include: {
        tags: { include: { tag: true } },
        children: {
          select: { id: true },
          where: { archivedAt: null },
        },
      },
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(
      children.map((c) => ({
        ...c,
        childCount: c.children.length,
        children: undefined,
      }))
    );
  } catch (error) {
    console.error('List children error:', error);
    return NextResponse.json({ error: 'Failed to list children' }, { status: 500 });
  }
}
