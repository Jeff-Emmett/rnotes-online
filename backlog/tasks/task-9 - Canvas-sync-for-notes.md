---
id: TASK-9
title: Canvas sync for notes
status: Done
assignee: []
created_date: '2026-02-13 20:39'
updated_date: '2026-02-13 22:04'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Test and verify bidirectional canvas sync with rSpace: creating canvas from notebook, pinning notes to canvas, receiving shape updates.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canvas sync callback wired up (onShapeUpdate → /api/sync). BLOCKED: rSpace /api/communities/:slug/shapes endpoint does not exist yet — pushShapesToCanvas will 404. Inbound sync works via postMessage.

rSpace shapes endpoint implemented and deployed. Internal API key for service-to-service auth. Canvas sync now functional: rnotes pushShapesToCanvas → rSpace POST /api/communities/:slug/shapes → Automerge doc update → WebSocket broadcast.
<!-- SECTION:NOTES:END -->
