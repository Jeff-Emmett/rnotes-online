import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';
import { tipTapJsonToMarkdown } from '@/lib/content-convert';
import archiver from 'archiver';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

/** Build YAML frontmatter from note metadata */
function buildFrontmatter(note: {
  id: string;
  type: string;
  cardType: string;
  url: string | null;
  language: string | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: { name: string } }[];
  notebook?: { title: string; slug: string } | null;
}): string {
  const lines: string[] = ['---'];

  lines.push(`type: ${note.cardType}`);
  if (note.url) lines.push(`url: ${note.url}`);
  if (note.language) lines.push(`language: ${note.language}`);
  if (note.isPinned) lines.push(`pinned: true`);
  if (note.notebook) lines.push(`notebook: ${note.notebook.title}`);

  if (note.tags.length > 0) {
    lines.push(`tags:`);
    for (const t of note.tags) {
      lines.push(`  - ${t.tag.name}`);
    }
  }

  lines.push(`created: ${note.createdAt.toISOString()}`);
  lines.push(`updated: ${note.updatedAt.toISOString()}`);
  lines.push('---');

  return lines.join('\n');
}

/** Extract markdown body from a note, preferring bodyMarkdown */
function getMarkdownBody(note: {
  bodyMarkdown: string | null;
  bodyJson: unknown;
  contentPlain: string | null;
  content: string;
}): string {
  // Prefer the stored markdown
  if (note.bodyMarkdown) return note.bodyMarkdown;

  // Convert from TipTap JSON if available
  if (note.bodyJson && typeof note.bodyJson === 'object') {
    try {
      return tipTapJsonToMarkdown(note.bodyJson as Parameters<typeof tipTapJsonToMarkdown>[0]);
    } catch {
      // fall through
    }
  }

  // Fall back to plain text
  return note.contentPlain || note.content || '';
}

/** Sanitize title to a safe filename */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200) || 'untitled';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    const noteId = searchParams.get('noteId');

    // --- Single note export ---
    if (noteId) {
      const note = await prisma.note.findFirst({
        where: { id: noteId, authorId: user.id, archivedAt: null },
        include: {
          tags: { include: { tag: true } },
          notebook: { select: { title: true, slug: true } },
        },
      });

      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      const frontmatter = buildFrontmatter(note);
      const body = getMarkdownBody(note);
      const md = `${frontmatter}\n\n# ${note.title}\n\n${body}\n`;

      const filename = sanitizeFilename(note.title) + '.md';

      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // --- Batch export as ZIP ---
    const where: Record<string, unknown> = {
      authorId: user.id,
      archivedAt: null,
    };
    if (notebookId) where.notebookId = notebookId;

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        notebook: { select: { title: true, slug: true } },
        attachments: { include: { file: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const usedFilenames = new Set<string>();

    for (const note of notes) {
      const frontmatter = buildFrontmatter(note);
      const body = getMarkdownBody(note);
      const md = `${frontmatter}\n\n# ${note.title}\n\n${body}\n`;

      let filename = sanitizeFilename(note.title);
      if (usedFilenames.has(filename)) {
        filename = `${filename}_${note.id.slice(0, 6)}`;
      }
      usedFilenames.add(filename);

      archive.append(md, { name: `notes/${filename}.md` });

      // Include attachments
      for (const att of note.attachments) {
        const filePath = path.join(UPLOAD_DIR, att.file.storageKey);
        if (existsSync(filePath)) {
          const fileData = await readFile(filePath);
          archive.append(fileData, { name: `attachments/${att.file.storageKey}` });
        }
      }
    }

    await archive.finalize();

    const buffer = Buffer.concat(chunks);
    const zipName = notebookId ? 'rnotes-notebook-export.zip' : 'rnotes-export.zip';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });
  } catch (error) {
    console.error('Markdown export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
