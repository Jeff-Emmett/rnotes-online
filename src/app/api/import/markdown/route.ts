import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthed } from '@/lib/auth';
import { markdownToTipTapJson, tipTapJsonToHtml } from '@/lib/content-convert';
import { stripHtml } from '@/lib/strip-html';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// ─── ZIP extraction (reused from logseq import) ─────────────────────

async function extractZip(buffer: Buffer): Promise<Map<string, Buffer>> {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);

    const filename = buffer.toString('utf8', offset + 30, offset + 30 + filenameLength);
    const dataStart = offset + 30 + filenameLength + extraLength;

    if (compressedSize > 0 && !filename.endsWith('/')) {
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        entries.set(filename, Buffer.from(compressedData));
      } else if (compressionMethod === 8) {
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

// ─── YAML frontmatter parser ─────────────────────────────────────────

interface Frontmatter {
  type?: string;
  url?: string;
  language?: string;
  pinned?: boolean;
  notebook?: string;
  tags?: string[];
  created?: string;
  updated?: string;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(fmRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = content.slice(match[0].length);
  const fm: Frontmatter = {};

  // Simple YAML key: value parser (handles scalar values and tag lists)
  const lines = yamlBlock.split('\n');
  let currentKey: string | null = null;
  let tagList: string[] = [];

  for (const line of lines) {
    const scalarMatch = line.match(/^(\w+):\s*(.+)$/);
    const listKeyMatch = line.match(/^(\w+):\s*$/);
    const listItemMatch = line.match(/^\s+-\s+(.+)$/);

    if (scalarMatch) {
      const [, key, value] = scalarMatch;
      currentKey = key;
      switch (key) {
        case 'type': fm.type = value; break;
        case 'url': fm.url = value; break;
        case 'language': fm.language = value; break;
        case 'pinned': fm.pinned = value === 'true'; break;
        case 'notebook': fm.notebook = value; break;
        case 'created': fm.created = value; break;
        case 'updated': fm.updated = value; break;
      }
    } else if (listKeyMatch) {
      currentKey = listKeyMatch[1];
      if (currentKey === 'tags') tagList = [];
    } else if (listItemMatch && currentKey === 'tags') {
      tagList.push(listItemMatch[1].trim().toLowerCase());
    }
  }

  if (tagList.length > 0) fm.tags = tagList;

  return { frontmatter: fm, body };
}

/** Extract title from first # heading or filename */
function extractTitle(body: string, filename: string): { title: string; bodyWithoutTitle: string } {
  const headingMatch = body.match(/^\s*#\s+(.+)\s*\n/);
  if (headingMatch) {
    return {
      title: headingMatch[1].trim(),
      bodyWithoutTitle: body.slice(headingMatch[0].length).trimStart(),
    };
  }
  // Fall back to filename without extension
  return {
    title: filename.replace(/\.md$/i, '').replace(/[_-]/g, ' '),
    bodyWithoutTitle: body,
  };
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const { user } = auth;

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const notebookId = formData.get('notebookId') as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const importedNotes: { title: string; id: string }[] = [];

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        // ── ZIP of markdown files ──
        const buffer = Buffer.from(await file.arrayBuffer());
        const entries = await extractZip(buffer);

        // First pass: extract attachment files
        const assetFiles = new Map<string, string>();
        for (const [name, data] of Array.from(entries.entries())) {
          if ((name.startsWith('attachments/') || name.startsWith('assets/')) && data.length > 0) {
            const assetName = name.replace(/^(attachments|assets)\//, '');
            const ext = path.extname(assetName);
            const storageKey = `${nanoid(12)}_${assetName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const filePath = path.join(UPLOAD_DIR, storageKey);
            await writeFile(filePath, data);

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

        // Second pass: import markdown files
        for (const [name, data] of Array.from(entries.entries())) {
          if (name.endsWith('.md') && data.length > 0) {
            const filename = path.basename(name);
            const content = data.toString('utf8');
            const note = await importMarkdownNote(content, filename, user.id, notebookId);
            if (note) importedNotes.push(note);
          }
        }
      } else if (file.name.endsWith('.md')) {
        // ── Single .md file ──
        const content = await file.text();
        const note = await importMarkdownNote(content, file.name, user.id, notebookId);
        if (note) importedNotes.push(note);
      } else {
        // Skip non-markdown files
        continue;
      }
    }

    return NextResponse.json({
      imported: importedNotes.length,
      notes: importedNotes,
    });
  } catch (error) {
    console.error('Markdown import error:', error);
    return NextResponse.json({ error: 'Failed to import' }, { status: 500 });
  }
}

/** Import a single markdown string as a note */
async function importMarkdownNote(
  content: string,
  filename: string,
  authorId: string,
  notebookId: string | null,
): Promise<{ title: string; id: string } | null> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { title, bodyWithoutTitle } = extractTitle(body, filename);

  if (!title.trim()) return null;

  const bodyMarkdown = bodyWithoutTitle.trim();
  const cardType = frontmatter.type || 'note';
  const noteType = cardTypeToNoteType(cardType);

  // Convert markdown → TipTap JSON → HTML for dual-write
  let bodyJson = null;
  let htmlContent = '';
  try {
    bodyJson = await markdownToTipTapJson(bodyMarkdown);
    htmlContent = tipTapJsonToHtml(bodyJson);
  } catch {
    htmlContent = bodyMarkdown
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  const contentPlain = stripHtml(htmlContent);

  // Find or create tags
  const tagRecords = [];
  if (frontmatter.tags) {
    for (const tagName of frontmatter.tags) {
      const name = tagName.trim().toLowerCase();
      if (!name) continue;
      const tag = await prisma.tag.upsert({
        where: { spaceId_name: { spaceId: '', name } },
        update: {},
        create: { name, spaceId: '' },
      });
      tagRecords.push(tag);
    }
  }

  const note = await prisma.note.create({
    data: {
      title: title.trim(),
      content: htmlContent,
      contentPlain,
      bodyMarkdown,
      bodyJson: bodyJson ? JSON.parse(JSON.stringify(bodyJson)) : undefined,
      bodyFormat: 'markdown',
      cardType,
      visibility: 'private',
      properties: {},
      type: noteType,
      authorId,
      notebookId: notebookId || null,
      url: frontmatter.url || null,
      language: frontmatter.language || null,
      isPinned: frontmatter.pinned || false,
      tags: {
        create: tagRecords.map((tag) => ({ tagId: tag.id })),
      },
    },
  });

  return { title: note.title, id: note.id };
}
