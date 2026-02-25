import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';
import { unlockArticle } from '@/lib/article-unlock';

/**
 * POST /api/articles/unlock
 *
 * Attempts to find an archived/readable version of a paywalled article.
 *
 * Body: { url: string, noteId?: string }
 *   - url: The article URL to unlock
 *   - noteId: (optional) If provided, updates the note's archiveUrl on success
 *
 * Returns: { success, strategy, archiveUrl, error? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;

    const body = await request.json();
    const { url, noteId } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const result = await unlockArticle(url);

    // If successful and noteId provided, update the note's archiveUrl
    if (result.success && result.archiveUrl && noteId) {
      const existing = await prisma.note.findUnique({
        where: { id: noteId },
        select: { authorId: true },
      });

      if (existing && (!existing.authorId || existing.authorId === auth.user.id)) {
        await prisma.note.update({
          where: { id: noteId },
          data: { archiveUrl: result.archiveUrl },
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Article unlock error:', error);
    return NextResponse.json(
      { success: false, strategy: 'none', error: 'Internal server error' },
      { status: 500 }
    );
  }
}
