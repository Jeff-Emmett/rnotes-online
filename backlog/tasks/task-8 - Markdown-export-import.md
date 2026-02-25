---
id: TASK-8
title: Markdown export/import
status: Done
assignee: []
created_date: '2026-02-13 20:39'
updated_date: '2026-02-25 05:19'
labels: []
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Export notes as .md files, import .md files as notes. Batch export notebooks as zip of markdown files.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented plain Markdown export/import for rNotes.

## Export (`GET /api/export/markdown`)
- **Single note**: `?noteId=<id>` returns a `.md` file with YAML frontmatter (type, tags, url, notebook, dates) and markdown body
- **Batch**: Returns a ZIP archive of all user notes as `notes/*.md` + `attachments/*`
- **Notebook filter**: `?notebookId=<id>` exports only that notebook's notes
- Uses stored `bodyMarkdown` or converts from TipTap JSON via `tipTapJsonToMarkdown()`

## Import (`POST /api/import/markdown`)
- Accepts multiple `.md` files and/or `.zip` archives via multipart form
- Parses YAML frontmatter for metadata (type, tags, url, language, pinned)
- Extracts title from first `# heading` or filename
- Dual-write: converts markdown → TipTap JSON → HTML for full format coverage
- Creates tags automatically via upsert
- ZIP imports also handle `attachments/` and `assets/` directories
- Optional `notebookId` form field to assign imported notes to a notebook

## Files
- `src/app/api/export/markdown/route.ts` (new)
- `src/app/api/import/markdown/route.ts` (new)
<!-- SECTION:FINAL_SUMMARY:END -->
