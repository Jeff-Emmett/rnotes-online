import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';
import { noteToLogseqPage, sanitizeLogseqFilename } from '@/lib/logseq-format';
import archiver from 'archiver';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');

    // Fetch notes
    const where: Record<string, unknown> = {
      authorId: user.id,
      archivedAt: null,
    };
    if (notebookId) where.notebookId = notebookId;

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        children: {
          select: { id: true, title: true, cardType: true },
          where: { archivedAt: null },
        },
        attachments: {
          include: { file: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Build ZIP archive
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Create pages directory
    const usedFilenames = new Set<string>();

    for (const note of notes) {
      // Generate Logseq page content
      const pageContent = noteToLogseqPage({
        title: note.title,
        cardType: note.cardType,
        visibility: note.visibility,
        bodyMarkdown: note.bodyMarkdown,
        contentPlain: note.contentPlain,
        properties: note.properties as Record<string, unknown>,
        tags: note.tags,
        children: note.children,
        attachments: note.attachments.map((a) => ({
          file: { storageKey: a.file.storageKey, filename: a.file.filename },
          caption: a.caption,
        })),
      });

      // Unique filename
      let filename = sanitizeLogseqFilename(note.title);
      if (usedFilenames.has(filename)) {
        filename = `${filename}_${note.id.slice(0, 6)}`;
      }
      usedFilenames.add(filename);

      archive.append(pageContent, { name: `pages/${filename}.md` });

      // Copy attachments into assets/
      for (const att of note.attachments) {
        const filePath = path.join(UPLOAD_DIR, att.file.storageKey);
        if (existsSync(filePath)) {
          const fileData = await readFile(filePath);
          archive.append(fileData, { name: `assets/${att.file.storageKey}` });
        }
      }
    }

    // Add logseq config
    archive.append(JSON.stringify({
      "meta/version": 2,
      "block/journal?": false,
    }, null, 2), { name: 'logseq/config.edn' });

    await archive.finalize();

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="rnotes-logseq-export.zip"`,
      },
    });
  } catch (error) {
    console.error('Logseq export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
