---
id: TASK-7
title: EncryptID auth integration
status: Done
assignee: []
created_date: '2026-02-13 20:39'
updated_date: '2026-02-13 21:20'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire up EncryptID SDK for user authentication. JWT session management, user-scoped notes/notebooks. Currently the app has no auth - all data is shared.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
EncryptID auth integrated:
- @encryptid/sdk installed as local file dep
- Server auth: getAuthUser, requireAuth, getNotebookRole in src/lib/auth.ts
- Client auth: authFetch wrapper with JWT token in src/lib/authFetch.ts
- UI: AuthProvider, UserMenu, /auth/signin passkey page
- All write routes protected (POST/PUT/DELETE require auth)
- Read routes remain public
- First-user auto-claims orphaned notebooks/notes
- Ownership: notebook collaborator roles, note author verification
- Build verified clean (Next.js 14.2.35)
- Pushed to Gitea main branch
<!-- SECTION:NOTES:END -->
