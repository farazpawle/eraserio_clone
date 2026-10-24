---
Title: Plan — Stage 0 Foundations (security upgrades, Graphite tokens, brand)
Description: Step plan for Stage 0 of Plan/redesign-eraser-canvas-tasks.md. Upgrades Next to 14.2.35 and Excalidraw to 0.18.1 behind a 0.17.6 whiteboard regression test, then adds the brand constant, Graphite colour tokens, Inter and JetBrains Mono fonts, and a dark default theme.
Total Tasks: 12
Status: In progress
Updated: 2026-10-24
---

# Stage 0 — Foundations: step plan

**Goal:** Safe, current dependencies and the Graphite look's foundations (tokens, fonts, brand name, dark default) with no screen redesigned yet.

**Spec:** `Plan/redesign-eraser-canvas-plan.md`, tasks in `Plan/redesign-eraser-canvas-tasks.md` (Stage 0).

## Findings that change the task text

- `next-themes` is in `package.json` but **imported nowhere**. Theme lives in `app/_context/ThemeContext.tsx` + `app/_hooks/useUserSettings.tsx` (default `'system'`). Task 0.11 therefore changes `DEFAULT_SETTINGS.theme` to `'dark'` there; `next-themes` is left alone (removing it is outside Stage 0).
- `supabase` branch `feat/supabase-migration` is already merged into `main`, so 0.1 can go ahead. `main` is 5 commits ahead of `origin/main` (not pushed).
- Latest 14.2.x is **14.2.35**; Excalidraw `latest` is **0.18.1**.
- A 0.17.6 round-trip test is a regression guard: it passes on 0.17.6 (baseline) and must still pass after the upgrade, so there is no red step for it.
- Tailwind config replaces spacing, fonts and colours wholesale from `lib/design-tokens.ts`; Graphite names are added under `extend.colors` only, existing names untouched.

## Steps

- [x] 0.1 `git checkout -b feat/redesign-canvas` from `main`.
- [x] 0.2 `npm i next@14.2.35`; run `npx tsc --noEmit`, `npm test`, `npm run build`. Commit. (`npm audit` still shows unpatched critical Next.js RCEs with no 14.2.x fix — logged as backlog item 9 in `Plan/later-backlog.md`, user confirmed deferring the Next 15/16 upgrade to its own plan.)
- [ ] 0.3 Read one real whiteboard from the live `files` table (read-only select, `eraser-supabase-db` skill), check it has no private text, save as `Tests/canvas/fixtures/whiteboard-0176.json`.
- [ ] 0.4 `Tests/canvas/restore.test.ts`: fixture → `restoreElements(elements, null)` keeps count, ids and text. Run on 0.17.6 (baseline green).
- [ ] 0.5 `npm i @excalidraw/excalidraw@0.18.1`; 0.4 test stays green.
- [ ] 0.6 Fix integration in `WSCanvas.tsx` (CSS import `@excalidraw/excalidraw/index.css`, `window.EXCALIDRAW_ASSET_PATH`, `transpilePackages` only if the build needs it); `tsc` + `build` green; browser smoke on a real file.
- [x] 0.7 `lib/brand.ts` (`BRAND_NAME = "Draftboard"`), used in `app/layout.tsx` metadata title (test: title contains the constant).
- [x] 0.8 Graphite tokens from `designs/redesign/editor.html` (dark default + `[data-theme="light"]`, `--faint` as in the prototype) into `app/globals.css` as `--g-*` variables, non-clashing with shadcn names. (`--g-faint` checked against `--g-bg`/`--g-panel` in both themes — already ≥4.5:1, no value change needed.)
- [x] 0.9 Map `--g-*` to Tailwind names under `extend.colors` (e.g. `g-bg`, `g-panel`, `g-line`, `g-text`, `g-muted`, `g-faint`, `g-accent`).
- [x] 0.10 `next/font` Inter + JetBrains Mono in `app/layout.tsx`, exposed as `--font-inter` / `--font-mono` variables.
- [x] 0.11 `DEFAULT_SETTINGS.theme = 'dark'` in `useUserSettings.tsx`; initial `actualTheme` in `ThemeContext.tsx` follows it; light stays selectable. (No existing tests referenced the old `'system'` default, so none needed updating.)
- [ ] 0.12 Record installed versions (next, excalidraw, elkjs, codemirror) in the task file header.

## Verify

`npx tsc --noEmit`, `npm test`, `npm run build` green; an old file opens with every shape intact in the browser; `npm audit` shows nothing critical for next or excalidraw.
