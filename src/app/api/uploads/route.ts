import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { requireAuth, isAuthed } from '@/lib/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  // Documents
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  'application/json', 'application/xml',
  // Archives
  'application/zip', 'application/gzip',
  // Code
  'text/javascript', 'text/typescript', 'text/html', 'text/css',
  'application/x-python-code', 'text/x-python',
  // Audio
  'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
  'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac',
]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!isAuthed(auth)) return auth;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || '';
    const safeName = sanitizeFilename(path.basename(file.name, ext));
    const uniqueName = `${nanoid(12)}_${safeName}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Validate the resolved path is within UPLOAD_DIR
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/api/uploads/${uniqueName}`;

    return NextResponse.json({
      url: fileUrl,
      filename: uniqueName,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
