---
id: TASK-15
title: 'EncryptID personal subdomains: <user>.r*.online with local-first data'
status: In Progress
assignee: []
created_date: '2026-02-25 03:01'
updated_date: '2026-02-25 03:54'
labels:
  - architecture
  - auth
  - encryptid
  - infrastructure
  - cross-app
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a user logs in via EncryptID, they should operate out of `<encryptID>.r*.online` (e.g., `alice.rnotes.online`, `alice.rspace.online`), with all their data saved securely to their local space.

## Scope

This is a cross-cutting feature affecting all rStack apps. Key areas:

### 1. DNS & Routing
- Wildcard DNS for each `r*.online` domain (`*.rnotes.online`, `*.rspace.online`, etc.)
- Cloudflare wildcard CNAME records pointing to the tunnel
- Traefik wildcard Host rules to route `*.r*.online` to the correct app container

### 2. Auth / EncryptID Integration
- On login, redirect to `<encryptID>.r*.online`
- Middleware to extract subdomain, validate it matches the authenticated EncryptID
- Reject requests where subdomain doesn't match session identity

### 3. Data Isolation & Local-First Storage
- Each user's data is scoped to their EncryptID
- Explore local-first / CRDTs (e.g., Yjs, Automerge) for offline-capable storage
- Sync strategy: local device ↔ user's personal encrypted space on server
- Encryption at rest using keys derived from EncryptID

### 4. Multi-App Consistency
- Shared auth session across `*.r*.online` subdomains (cross-subdomain cookies or token-based)
- AppSwitcher links should resolve to `<user>.rspace.online`, `<user>.rnotes.online`, etc. when logged in
- Consistent UX: user always sees their subdomain in the URL bar

### 5. Migration
- Existing data needs a migration path to the new per-user scoped storage
- Backward compat for users accessing the root domain (redirect to subdomain after login)

## Open Questions
- What is the EncryptID identifier format? (alphanumeric, length constraints, case sensitivity)
- Should unauthenticated users see public content at the root domain?
- How does this interact with rSpace's existing space/room model?
- Storage backend: SQLite per user? Postgres row-level security? Encrypted blob store?
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wildcard DNS configured for all r*.online domains
- [ ] #2 Middleware extracts and validates EncryptID from subdomain
- [ ] #3 User data is scoped and encrypted per EncryptID
- [ ] #4 AppSwitcher links resolve to user's personal subdomain when logged in
- [ ] #5 Cross-subdomain auth session works across rStack apps
- [ ] #6 Migration path defined for existing data
- [ ] #7 Local-first storage strategy documented and prototyped
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research complete - EncryptID uses DID format (did:key:z<base64url>, 50+ chars). DIDs too long for DNS labels (63 char limit). Username-based subdomains recommended but usernames are currently optional.
<!-- SECTION:NOTES:END -->
