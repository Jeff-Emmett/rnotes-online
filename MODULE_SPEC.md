# rNotes — Collaborative Notebooks

**Module ID:** `rnotes`
**Domain:** `rnotes.online`
**Version:** 0.1.0
**Framework:** Next.js 14 / React 18 / Prisma / PostgreSQL / TipTap
**Status:** Active

## Purpose

Rich note-taking with notebooks, tags, file uploads, voice transcription, and canvas integration. Supports per-notebook collaboration with role-based access. Notes can embed as shapes on the rSpace canvas.

## Data Model

### Core Entities (Prisma)

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | id, did (EncryptID DID), username | has many Notebook, Note, NotebookCollaborator |
| **Notebook** | id, title, slug (unique), description, coverColor, isPublic, canvasSlug, canvasShapeId | has many Note, NotebookCollaborator, SharedAccess |
| **NotebookCollaborator** | userId, notebookId, role (OWNER/EDITOR/VIEWER) | belongs to User, Notebook |
| **Note** | id, title, content, contentPlain, type (enum), url, isPinned, sortOrder, canvasSlug, canvasShapeId | belongs to Notebook, User (author) |
| **Tag** | id, name (unique), color | many-to-many with Note via NoteTag |
| **SharedAccess** | notebookId, sharedByUserId, sharedWithDID, role | cross-user sharing |

### Note Types

NOTE, CLIP, BOOKMARK, CODE, IMAGE, FILE, AUDIO

### Collaborator Roles

OWNER, EDITOR, VIEWER (per-notebook)

## Permission Model

### Space Integration

rNotes currently operates at the notebook level, not the space level. The migration path adds a space-level role that sets the default notebook access.

- **SpaceVisibility:** Mapped to notebook `isPublic` flag (public → true)
- **Default role for open spaces:** PARTICIPANT (can create notebooks and edit own notes)

### Capabilities

| Capability | Required SpaceRole | AuthLevel | Description |
|-----------|-------------------|-----------|-------------|
| `view_notebooks` | VIEWER | BASIC | See notebook list and read notes |
| `create_notebook` | PARTICIPANT | STANDARD | Create new notebooks |
| `edit_own_notes` | PARTICIPANT | STANDARD | Edit/delete own notes in any shared notebook |
| `edit_any_notes` | MODERATOR | STANDARD | Edit/delete any user's notes |
| `manage_notebooks` | ADMIN | ELEVATED | Delete notebooks, manage collaborators |

### Module-Specific Overrides

Per-notebook `CollaboratorRole` overrides the space-level default:
- Space PARTICIPANT + Notebook OWNER → full notebook control
- Space PARTICIPANT + Notebook VIEWER → read-only on that notebook
- Space MODERATOR → EDITOR on all notebooks (override)
- Space ADMIN → OWNER on all notebooks (override)

### Current Auth Implementation

- EncryptID DID from JWT claims
- `getAuthUser(request)` → extracts DID, upserts User
- `requireAuth(request)` → returns 401 if no valid token
- `getNotebookRole(userId, notebookId)` → looks up CollaboratorRole
- First authenticated user auto-claims orphaned notebooks

## API Endpoints

| Method | Path | Auth Required | Capability | Description |
|--------|------|---------------|------------|-------------|
| GET | /api/notebooks | Yes | view_notebooks | List user's notebooks |
| POST | /api/notebooks | Yes | create_notebook | Create notebook |
| GET | /api/notebooks/[id] | Depends | view_notebooks | Get notebook details |
| PUT | /api/notebooks/[id] | Yes | edit_own_notes | Update notebook |
| DELETE | /api/notebooks/[id] | Yes | manage_notebooks | Delete notebook |
| GET | /api/notebooks/[id]/notes | Depends | view_notebooks | List notes |
| GET | /api/notebooks/[id]/canvas | Yes | view_notebooks | Get canvas shape data |
| PUT | /api/notebooks/[id]/canvas | Yes | edit_own_notes | Update canvas binding |
| GET | /api/notes | Yes | view_notebooks | Global notes list |
| POST | /api/notes | Yes | edit_own_notes | Create note |
| GET | /api/notes/[id] | Depends | view_notebooks | Get note |
| PUT | /api/notes/[id] | Yes | edit_own_notes | Update note |
| DELETE | /api/notes/[id] | Yes | edit_own_notes | Delete own note |
| GET | /api/notes/search | Yes | view_notebooks | Full-text search |
| POST | /api/uploads | Yes | edit_own_notes | Upload file |
| GET | /api/uploads/[filename] | Depends | view_notebooks | Download file |
| POST | /api/voice/transcribe | Yes | edit_own_notes | Audio→text |
| POST | /api/voice/diarize | Yes | edit_own_notes | Speaker diarization |

## Canvas Integration

Notes and notebooks embed as shapes on the rSpace canvas:
- **`folk-note`**: Individual note card (title + content preview)
- **`folk-notebook`**: Notebook container showing note count
- Bidirectional binding via `canvasSlug` and `canvasShapeId` fields
- Editing a note shape on canvas updates the note in PostgreSQL
- Creating a note in rNotes can auto-place a shape on canvas

## Cross-Module Dependencies

| Module | Integration |
|--------|------------|
| **rSpace** | Canvas shape embedding (folk-note, folk-notebook) |
| **EncryptID** | DID-based identity and authentication |
| **rFiles** | File attachments referenced in notes |

## Local-First / Offline Support

- Currently server-authoritative (Prisma/PostgreSQL)
- Client state managed with Zustand
- Local-first Transformers.js for on-device AI inference
- Future: TipTap Y.js integration for offline collaborative editing
- Future: IndexedDB cache for offline note access

## Migration Plan

1. Add space concept: link notebooks to a space slug (optional, backwards-compatible)
2. Import `SpaceRole` from SDK for space-level role resolution
3. Add `resolveSpaceRole()` call in `getAuthUser()` or a new middleware layer
4. Cascade space role → default notebook role:
   - Space PARTICIPANT → Notebook EDITOR (on newly accessed notebooks)
   - Space VIEWER → Notebook VIEWER
   - Space MODERATOR → Notebook EDITOR (all notebooks)
   - Space ADMIN → Notebook OWNER (all notebooks)
5. Keep per-notebook `CollaboratorRole` overrides for fine-grained control
6. Replace direct role checks with `hasCapability()` in API route handlers
