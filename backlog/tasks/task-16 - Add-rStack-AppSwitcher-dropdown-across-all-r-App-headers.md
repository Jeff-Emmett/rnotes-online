---
id: TASK-16
title: Add rStack AppSwitcher dropdown across all r*App headers
status: Done
assignee: []
created_date: '2026-02-25 03:47'
labels:
  - feature
  - ui
  - cross-app
  - branding
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Added the unified rStack AppSwitcher dropdown to the header/nav of all 19 r*-online repos plus the rSpace platform Web Component.

## What was done

### rSpace platform (rspace-online)
- Rewrote `shared/components/rstack-app-switcher.ts` Web Component with:
  - Pastel rainbow badges (rS, rN, rP, rC, rT, etc.) replacing plain emoji icons
  - Emoji moved to right of app name in dropdown items
  - rStack header with gradient badge at top of dropdown
  - rStack footer link at bottom
  - Canvas renamed to rSpace
  - rMaps moved to Planning category
  - "Sharing & Media" renamed to "Social & Sharing" with rNetwork at top
- Fixed light→dark theme across all 21 modules (was causing white header bar)
- Renamed canvas module to "rSpace"

### rnotes-online
- Created React `AppSwitcher.tsx` component
- Created shared `Header.tsx` with AppSwitcher + SpaceSwitcher + breadcrumbs
- Integrated into all 9 page files

### 14 other Next.js repos
- Copied `AppSwitcher.tsx` React component into each
- Integrated into existing Header/Navbar components
- Repos: rPubs, rauctions, rcal, rcart, rchats, rfunds, rinbox, rmail, rmaps, rsocials, rtrips, rtube, rvote, rwork

### 4 non-Next.js repos
- Created standalone HTML/CSS/JS AppSwitcher (no framework dependencies)
- Repos: rNetwork (Vite), rfiles (Django), rstack (static), rwallet (static)

All repos committed and pushed to main on Gitea.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AppSwitcher shows pastel badges with r* abbreviations
- [ ] #2 Emoji displayed to the right of app name
- [ ] #3 rStack header with gradient badge at top of dropdown
- [ ] #4 5 categories: Creating, Planning, Discussing & Deciding, Funding & Commerce, Social & Sharing
- [ ] #5 rMaps under Planning, rNetwork at top of Social & Sharing
- [ ] #6 All 19 standalone repos have AppSwitcher integrated
- [ ] #7 rSpace Web Component updated with matching branding
- [ ] #8 Dark theme applied to all rSpace module shells
- [ ] #9 All repos pushed to main on Gitea
- [ ] #10 rspace-online and rnotes-online deployed to production
<!-- AC:END -->
