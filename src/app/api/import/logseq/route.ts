import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';
import { logseqPageToNote } from '@/lib/logseq-format';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// Simple unzip using built-in Node.js zlib
async function extractZip(buffer: Buffer): Promise<Map<string, Buffer>> {
  const entries = new Map<string, Buffer>();

  // Manual ZIP parsing (PKZip format)
  let offset = 0;
  while (offset < buffer.length - 4) {
    // Local file header signature
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);

    const filename = buffer.toString('utf8', offset + 30, offset + 30 + filenameLength);
    const dataStart = offset + 30 + filenameLength + extraLength;

    if (compressedSize > 0 && !filename.endsWith('/')) {
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        // Stored (no compression)
        entries.set(filename, Buffer.from(compressedData));
      } else if (compressionMethod === 8) {
        // Deflate
        const zlib = await import('zlib');
        try {
          const inflated = zlib.inflateRawSync(compressedData);
          entries.set(filename, inflated);
        } catch {
          // Skip corrupted entries
        }
      }
    }

    offset = dataStart + compressedSize;
  }

  return entries;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const notebookId = formData.get('notebookId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const entries = await extractZip(buffer);

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Phase 1: Extract assets
    const assetFiles = new Map<string, string>(); // original path → storageKey
    for (const [name, data] of Array.from(entries.entries())) {
      if (name.startsWith('assets/') && data.length > 0) {
        const assetName = name.replace('assets/', '');
        const ext = path.extname(assetName);
        const storageKey = `${nanoid(12)}_${assetName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = path.join(UPLOAD_DIR, storageKey);
        await writeFile(filePath, data);

        // Create File record
        await prisma.file.create({
          data: {
            storageKey,
            filename: assetName,
            mimeType: guessMimeType(ext),
            sizeBytes: data.length,
            authorId: user.id,
          },
        });

        assetFiles.set(assetName, storageKey);
      }
    }

    // Phase 2: Parse pages
    const importedNotes: { filename: string; parsed: ReturnType<typeof logseqPageToNote>; noteId?: string }[] = [];

    for (const [name, data] of Array.from(entries.entries())) {
      if (name.startsWith('pages/') && name.endsWith('.md') && data.length > 0) {
        const filename = name.replace('pages/', '');
        const content = data.toString('utf8');
        const parsed = logseqPageToNote(filename, content);
        importedNotes.push({ filename, parsed });
      }
    }

    // Phase 3: Create notes
    const titleToId = new Map<string, string>();

    for (const item of importedNotes) {
      const { parsed } = item;

      // Convert bodyMarkdown to HTML (simple)
      const htmlContent = parsed.bodyMarkdown
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      // Find or create tags
      const tagRecords = [];
      for (const tagName of parsed.tags) {
        const tag = await prisma.tag.upsert({
          where: { spaceId_name: { spaceId: '', name: tagName } },
          update: {},
          create: { name: tagName, spaceId: '' },
        });
        tagRecords.push(tag);
      }

      const note = await prisma.note.create({
        data: {
          title: parsed.title,
          content: htmlContent,
          contentPlain: parsed.bodyMarkdown,
          bodyMarkdown: parsed.bodyMarkdown,
          bodyFormat: 'markdown',
          cardType: parsed.cardType,
          visibility: parsed.visibility,
          properties: parsed.properties,
          type: cardTypeToNoteType(parsed.cardType),
          authorId: user.id,
          notebookId: notebookId || null,
          tags: {
            create: tagRecords.map((tag) => ({ tagId: tag.id })),
          },
        },
      });

      item.noteId = note.id;
      titleToId.set(parsed.title, note.id);

      // Link attachments
      for (const assetPath of parsed.attachmentPaths) {
        const storageKey = assetFiles.get(assetPath);
        if (storageKey) {
          const fileRecord = await prisma.file.findUnique({ where: { storageKey } });
          if (fileRecord) {
            await prisma.cardAttachment.create({
              data: {
                noteId: note.id,
                fileId: fileRecord.id,
                role: 'supporting',
                position: 0,
              },
            });
          }
        }
      }
    }

    // Phase 4: Link parent-child relationships
    for (const item of importedNotes) {
      if (!item.noteId) continue;
      const { parsed } = item;
      for (const childTitle of parsed.childTitles) {
        const childId = titleToId.get(childTitle);
        if (childId) {
          await prisma.note.update({
            where: { id: childId },
            data: { parentId: item.noteId },
          });
        }
      }
    }

    return NextResponse.json({
      imported: importedNotes.length,
      assets: assetFiles.size,
      notes: importedNotes.map((n) => ({ title: n.parsed.title, id: n.noteId })),
    });
  } catch (error) {
    console.error('Logseq import error:', error);
    return NextResponse.json({ error: 'Failed to import' }, { status: 500 });
  }
}

function cardTypeToNoteType(cardType: string): 'NOTE' | 'BOOKMARK' | 'CLIP' | 'CODE' | 'IMAGE' | 'FILE' | 'AUDIO' {
  const map: Record<string, 'NOTE' | 'BOOKMARK' | 'CLIP' | 'CODE' | 'IMAGE' | 'FILE' | 'AUDIO'> = {
    note: 'NOTE',
    link: 'BOOKMARK',
    reference: 'CLIP',
    file: 'FILE',
    task: 'NOTE',
    person: 'NOTE',
    idea: 'NOTE',
  };
  return map[cardType] || 'NOTE';
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown',
    '.json': 'application/json', '.csv': 'text/csv',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.webm': 'audio/webm', '.mp4': 'audio/mp4',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
