---
id: TASK-12
title: Optimize Docker image size - use CPU-only torch
status: Done
assignee: []
created_date: '2026-02-15 17:17'
updated_date: '2026-02-15 17:29'
labels: []
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Voice-command Docker image is ~3.5GB due to full torch with CUDA/nvidia libs. Netcup has no GPU. Switch to CPU-only torch wheel (pip install torch --index-url https://download.pytorch.org/whl/cpu) to cut ~2GB. Also consider if pyannote.audio can use ONNX runtime instead of torch for inference. Current memory limit is 4G.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CPU-only torch optimization deployed to Netcup.
Image size: 4.19GB (still large due to pyannote deps, but CUDA libs removed).
Health check passes, WebSocket streaming verified working.
<!-- SECTION:NOTES:END -->
