/**
 * Backfill script: Populate Memory Card fields for existing notes.
 *
 * Processes all notes where bodyJson IS NULL:
 * 1. htmlToTipTapJson(content) → bodyJson
 * 2. tipTapJsonToMarkdown(bodyJson) → bodyMarkdown
 * 3. mapNoteTypeToCardType(type) → cardType
 * 4. sortOrder * 1.0 → position
 * 5. bodyFormat = 'html'
 *
 * Also backfills fileUrl references into File + CardAttachment records.
 *
 * Run: docker exec rnotes-online npx tsx scripts/backfill-memory-card.ts
 */

import { PrismaClient } from '@prisma/client';
import { htmlToTipTapJson, tipTapJsonToMarkdown, mapNoteTypeToCardType } from '../src/lib/content-convert';

const prisma = new PrismaClient();
const BATCH_SIZE = 50;

async function backfillNotes() {
  console.log('=== Memory Card Backfill ===\n');

  // Count notes needing backfill
  const total = await prisma.note.count({
    where: { bodyJson: null, content: { not: '' } },
  });
  console.log(`Found ${total} notes to backfill.\n`);

  if (total === 0) {
    console.log('Nothing to do!');
    return;
  }

  let processed = 0;
  let errors = 0;

  while (true) {
    const notes = await prisma.note.findMany({
      where: { bodyJson: null, content: { not: '' } },
      select: { id: true, content: true, type: true, sortOrder: true, fileUrl: true, mimeType: true, fileSize: true, authorId: true },
      take: BATCH_SIZE,
    });

    if (notes.length === 0) break;

    for (const note of notes) {
      try {
        const bodyJson = htmlToTipTapJson(note.content);
        const bodyMarkdown = tipTapJsonToMarkdown(bodyJson);
        const cardType = mapNoteTypeToCardType(note.type);

        await prisma.note.update({
          where: { id: note.id },
          data: {
            bodyJson,
            bodyMarkdown,
            bodyFormat: 'html',
            cardType,
            position: note.sortOrder * 1.0,
          },
        });

        // Backfill fileUrl → File + CardAttachment
        if (note.fileUrl) {
          const storageKey = note.fileUrl.replace(/^\/api\/uploads\//, '');
          if (storageKey && storageKey !== note.fileUrl) {
            // Check if File record already exists
            const existingFile = await prisma.file.findUnique({
              where: { storageKey },
            });

            if (!existingFile) {
              const file = await prisma.file.create({
                data: {
                  storageKey,
                  filename: storageKey.replace(/^[a-zA-Z0-9_-]+_/, ''), // strip nanoid prefix
                  mimeType: note.mimeType || 'application/octet-stream',
                  sizeBytes: note.fileSize || 0,
                  authorId: note.authorId,
                },
              });

              await prisma.cardAttachment.create({
                data: {
                  noteId: note.id,
                  fileId: file.id,
                  role: 'primary',
                  position: 0,
                },
              });
            } else {
              // File exists, just link it
              const existingLink = await prisma.cardAttachment.findUnique({
                where: { noteId_fileId: { noteId: note.id, fileId: existingFile.id } },
              });
              if (!existingLink) {
                await prisma.cardAttachment.create({
                  data: {
                    noteId: note.id,
                    fileId: existingFile.id,
                    role: 'primary',
                    position: 0,
                  },
                });
              }
            }
          }
        }

        processed++;
      } catch (err) {
        errors++;
        console.error(`  Error on note ${note.id}:`, err);
      }
    }

    console.log(`  Processed ${processed}/${total} (${errors} errors)`);
  }

  // Also backfill notes with empty content (set bodyJson to empty doc)
  const emptyNotes = await prisma.note.count({
    where: { bodyJson: null, content: '' },
  });
  if (emptyNotes > 0) {
    await prisma.note.updateMany({
      where: { bodyJson: null, content: '' },
      data: {
        bodyJson: { type: 'doc', content: [] },
        bodyMarkdown: '',
        bodyFormat: 'html',
        cardType: 'note',
      },
    });
    console.log(`  Set ${emptyNotes} empty notes to empty doc.`);
  }

  // Update tags: set spaceId to '' where null
  const nullSpaceTags = await prisma.$executeRaw`
    UPDATE "Tag" SET "spaceId" = '' WHERE "spaceId" IS NULL
  `;
  if (nullSpaceTags > 0) {
    console.log(`  Updated ${nullSpaceTags} tags with null spaceId to ''.`);
  }

  console.log(`\n=== Done! ${processed} notes backfilled, ${errors} errors ===`);

  // Verify
  const remaining = await prisma.note.count({
    where: { bodyJson: null, content: { not: '' } },
  });
  console.log(`Remaining unprocessed notes: ${remaining}`);
}

backfillNotes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
