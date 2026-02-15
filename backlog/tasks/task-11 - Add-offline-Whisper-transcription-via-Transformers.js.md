---
id: TASK-11
title: Add offline Whisper transcription via Transformers.js
status: Done
assignee: []
created_date: '2026-02-15 17:17'
updated_date: '2026-02-15 20:42'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement WhisperOffline.tsx component that loads @xenova/transformers Whisper model in the browser. Cache model via Cache API (~40MB). Use as fallback in VoiceRecorder when WebSocket streaming is unavailable (offline, server down). Show download progress on first use. Currently the fallback is batch transcription via server - this would enable fully offline transcription.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Offline Whisper via @xenova/transformers v2.17.2 deployed.
Model: Xenova/whisper-tiny (~45MB, quantized, cached in browser).
Fallback chain: WebSocket streaming > server batch API > offline browser Whisper.
webpack config: IgnorePlugin for onnxruntime-node, fs/path/os polyfill stubs.
Build passes, deployed to Netcup.
<!-- SECTION:NOTES:END -->
