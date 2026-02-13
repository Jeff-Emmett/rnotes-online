import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSlug } from '@/lib/slug';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const notebooks = await prisma.notebook.findMany({
      include: {
        _count: { select: { notes: true } },
        collaborators: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error('List notebooks error:', error);
    return NextResponse.json({ error: 'Failed to list notebooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, coverColor } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const baseSlug = generateSlug(title);
    const slug = baseSlug || nanoid(8);

    // Ensure unique slug
    const existing = await prisma.notebook.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${nanoid(4)}` : slug;

    const notebook = await prisma.notebook.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        coverColor: coverColor || '#f59e0b',
      },
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error('Create notebook error:', error);
    return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 });
  }
}
