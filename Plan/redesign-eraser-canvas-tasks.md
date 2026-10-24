---
Title: Tasks — Graphite redesign and Eraser-style canvas
Description: Atomic task list for Plan/redesign-eraser-canvas-plan.md. Stages 0–9: security upgrades and Graphite foundations, new editor,
  typed diagrams (flowchart + cloud, then sequence, ER, BPMN) on the Excalidraw canvas with ELK and a CodeMirror code panel, full cloud icon
  sets, then dashboard, login and landing redesigns. [User] tasks need a human look, a browser login or accepting icon licence terms; each says why.
Total Tasks: 110
Status: Stage 0 complete; stage 1 built and tested in code, waiting for the live database change, the browser check and the human look check; stages 2-9 not started
Updated: 2026-10-24
---

# Tasks — Graphite redesign and Eraser-style canvas

Each stage gets a detailed test-first step plan (writing-plans) when it starts. New logic is written test first (Rule 7). Tests live in `Tests/<feature>/`.

**Model:** stages marked **Opus (hard)** run on Opus; every other stage runs on Sonnet (high effort). The end-of-stage review always runs on Opus.

**Versions (as of stage 0, 2026-10-24):** next 14.2.35, @excalidraw/excalidraw 0.18.1. elkjs and codemirror are not installed yet — they arrive in Stage 2.

## Stage 0 — Foundations

- [x] 0.1 Create branch `feat/redesign-canvas` from `main` once the Supabase migration branch is merged.
- [x] 0.2 Upgrade `next` to the newest 14.2.x patch (14.2.3 is open to the middleware login bypass CVE-2025-29927, and `middleware.ts` guards logins). (`npm audit` still flags unpatched critical Next.js RCEs with no 14.2.x fix — the real fix is a breaking Next 15/16 upgrade, logged as its own backlog item in `Plan/later-backlog.md` rather than folded into this stage.)
- [x] 0.3 Save a real 0.17.6 whiteboard from the live database as `Tests/canvas/fixtures/whiteboard-0176.json`.
- [x] 0.4 Write a failing test: the 0.17.6 fixture goes through Excalidraw's `restoreElements` with the same element count, ids and text.
- [x] 0.5 Upgrade `@excalidraw/excalidraw` to the newest 0.18.x (0.18.1 or later fixes the Mermaid XSS CVE-2025-54881) and make 0.4 pass.
- [x] 0.6 Fix the Excalidraw 0.18 integration: CSS import, fonts path and ESM build (add `transpilePackages` only if the build needs it). (Browser smoke test passed: the real `test` file's diamond, ellipse and text all render intact on 0.18.1.)
- [x] 0.7 Add `lib/brand.ts` exporting `BRAND_NAME = "Draftboard"`, and use it for the page `<title>` in `app/layout.tsx`.
- [x] 0.8 Port the Graphite tokens from `designs/redesign/editor.html` (light, dark and the `--faint` values after the contrast fix) into `app/globals.css` as CSS variables.
- [x] 0.9 Map the new variables to Tailwind colour names in `tailwind.config.ts`, keeping the shadcn variable names working.
- [x] 0.10 Load Inter and JetBrains Mono with `next/font` in `app/layout.tsx`.
- [x] 0.11 Make dark the default theme in the `next-themes` provider, with light still selectable. (Theme default actually lives in `useUserSettings.tsx`/`ThemeContext.tsx`, not `next-themes`, which is installed but unused — see the stage's own step plan.)
- [x] 0.12 Record the installed versions (next, excalidraw, elkjs, codemirror) at the top of this file.

**Verify:** tsc, tests and build all pass. An old file opens with every shape intact. `npm audit` shows no critical issues for next or excalidraw.
- tsc, tests (315/315) and build: pass.
- `npm audit`: excalidraw clean; next still shows unpatched critical issues with no 14.2.x fix (backlog item 9, user-approved deferral).
- Browser check (old file opens, every shape intact): pass — the real `test` file opens with its diamond, ellipse and "smoke 23 Oct" text all intact on Excalidraw 0.18.1, dark theme on by default.

## Stage 1 — New editor (Graphite shell)

Step plan (13 test-first tasks covering 1.1–1.19): `Plan/stage-1-editor-plan.md`. User decisions 2026-10-24: "Invite by email" creates a team invitation; the Save button stays and gets a status label.

- [x] 1.1 Rebuild the header in `WSHeader.tsx`: logo, breadcrumb (team / file name, editable), Document/Both/Canvas switch, saved status, avatars, Export, Share. (Done in code (`WSHeader` plus name field, view switch, export, user menu). Avatar shows only the signed-in user; presence is later.)
- [x] 1.2 Add a `useEditorView` hook (`"doc" | "both" | "canvas"`, remembered per file in localStorage, falling back safely when storage is blocked) with a unit test. (Done (`useEditorView`, 7 tests).)
- [x] 1.3 Lay out the workspace page as a grid driven by the view (both = doc 40% + canvas; tabs only at ≤ 767px), keeping the existing resizable divider. (Done. Both panes stay mounted and are hidden with CSS, so unsaved work is never lost.)
- [x] 1.4 Restyle the Editor.js document pane to the prototype's document styles (eyebrow, H1/H2, checklist, callout, code). (Done for the blocks that exist (headings incl. level 1, lists, checklist, inline code). Callout and code blocks need new Editor.js packages: backlog item 10.)
- [x] 1.5 Theme Excalidraw to Graphite with CSS overrides on its `--color-*` variables in a scoped stylesheet. (Done in `workspace.css`; matching the canvas background to the Graphite colour needs a browser measurement (see Verify).)
- [x] 1.6 Move the Export menu from the canvas into the header's Export button (PNG, SVG, PDF, as today). (Done. One Export menu: document PDF, canvas PNG and SVG; exports now include pasted images.)
- [x] 1.7 Write a failing test: canvas `onChange` hands both elements and binary files to the save function. (Done (`persistCanvas`, tested).)
- [x] 1.8 Add migration `canvas_files` creating a private storage bucket `canvas-files` with RLS (team members of the file's team can read and write; nothing for `anon`). (Done (migration `20261024070046_canvas_files.sql`).)
- [x] 1.9 Add `lib/data/canvasFiles.ts` with `uploadCanvasFile(db, fileId, file)` and `loadCanvasFiles(db, fileId, ids)`, plus tests. (Done (`lib/data/canvasFiles.ts`, tested).)
- [x] 1.10 Save pasted images to the bucket and reload them on open; today they disappear after a reload. (Done in code for signed-in users and share links. Needs the browser check below.)
- [x] 1.11 Run `supabase/tests/rls.sql` against the new bucket policies. (Done on the local database: 30+ new checks pass, reviewed by `rls-security-reviewer`.)
- [ ] 1.12 Apply the migration to the live database (eraser-supabase-db skill). ([User] approval needed to change the live database; the live Storage service has not been checked yet.)
- [x] 1.13 Build a Share dialog matching the prototype (invite by email, link access, copy link) on the existing share functions. (Done. "Invite by email" creates a team invitation and copies its link (user decision 2026-10-24); the multi-link list is kept.)
- [x] 1.14 Make the shared view page (`shared/[token]`) use the same canvas theme in read-only mode. (Done in code (Graphite banner, header and layout, plus image routes with server-side checks). Needs the browser check below.)
- [x] 1.15 Keep the existing keyboard shortcuts working in the new shell (save, plus new shortcuts for Document/Both/Canvas), with a test. (Done. Save shortcut kept; Alt+1/2/3 switch views, even while typing.)
- [x] 1.16 Update the existing `Tests/workspace-improvements` tests that the header rebuild breaks. (Done. Only `WorkspaceLoading.test.tsx` needed new mocks and a looser skeleton count.)
- [x] 1.17 Add a light/dark switch to the user menu (the app has none after `toggleTheme` was hidden on the canvas). (Done. Theme choice (Light / Dark / System) sits in the avatar menu.)
- [x] 1.18 Restyle the editor's loading skeleton and "file not found" state to Graphite. (Done (`WorkspaceStates.tsx`).)
- [ ] 1.19 [User] Judge the new editor on the live site against the Graphite prototype (look and feel needs a human eye).

**Verify:**
- Browser check at 320, 375, 767, 768, 1023, 1024 and 1280 in both modes.
- No sideways scroll.
- A pasted image survives a reload.
- A viewer can't upload to the bucket.

## Stage 2 — Typed diagrams core (flowchart + cloud architecture) — Opus (hard)

- [ ] 2.1 Add `lib/diagram/types.ts`:
  - `DiagramType`;
  - `DiagramSettings` (direction, colorMode, styleMode, typeface, title);
  - `DiagramError {line, message}`;
  - `ParseResult<M> {model: M, errors: DiagramError[]}`.
- [ ] 2.2 Write failing tests for the settings-line parser (every value, unknown values → an error on that line).
- [ ] 2.3 Implement `parseSettings(lines): {settings, rest}` in `lib/diagram/parse/settings.ts`.
- [ ] 2.4 Write failing tests for the flow parser:
  - nodes and their attributes;
  - nested groups;
  - all 5 edge kinds;
  - labels, chains and fan-out;
  - nodes created by edges;
  - a missing `}`;
  - an unknown attribute;
  - one error per bad line, with the rest still parsed.
- [ ] 2.5 Implement `parseFlow(code): ParseResult<FlowModel>` in `lib/diagram/parse/flow.ts`.
- [ ] 2.6 Add `elkjs` and write failing layout tests: positions for every node, groups contain their children, `direction` changes the axis, the 150-node fixture finishes in under 1.5 s.
- [ ] 2.7 Implement `layoutFlow(model, settings): Promise<PositionedFlow>` in `lib/diagram/layout/flow.ts` (layered algorithm, `INCLUDE_CHILDREN`, orthogonal edges).
- [ ] 2.8 Add `lib/diagram/layout/elkWorker.ts` so the browser runs ELK in a web worker while tests call it directly.
- [ ] 2.9 Write failing tests for colour and style mapping:
  - colorMode pastel, bold and outline give fill and stroke values;
  - styleMode plain, shadow and watercolor give fill style, roughness and shadow;
  - typeface rough, clean and mono give the Excalidraw font family.
- [ ] 2.10 Implement `styleFor(node, settings)` in `lib/diagram/render/style.ts`. Shadow is an offset backing shape; watercolor is a hachure fill at higher roughness.
- [ ] 2.11 Write failing tests for element generation:
  - every shape kind;
  - labels bound to their shapes;
  - edge arrows bound to both ends, elbow style;
  - edge labels;
  - group outlines;
  - every element tagged with `customData.diagramId`.
- [ ] 2.12 Implement `toSkeletons(positioned, settings, origin): ExcalidrawElementSkeleton[]` in `lib/diagram/render/flow.ts`.
- [ ] 2.13 Write failing tests for the diagram block:
  - `createDiagram` makes a frame with code and settings in `customData`;
  - `updateDiagram` replaces only that frame's children;
  - a duplicate gets a new `diagramId`.
- [ ] 2.14 Implement `createDiagram`, `updateDiagram` and `readDiagram` in `lib/diagram/block.ts` on top of `convertToExcalidrawElements`.
- [ ] 2.15 Add CodeMirror 6 and build `DiagramCodePanel.tsx`:
  - syntax highlighting;
  - error underlines with each line's message;
  - autocomplete for attributes, settings and node names;
  - a 150 ms debounce before redrawing.
- [ ] 2.16 Open the code panel on double-click or select of a diagram frame; close it with Escape or the close button, returning focus.
- [ ] 2.17 Add a "Diagram" button to the canvas toolbar that inserts a starter flowchart at the centre of the view.
- [ ] 2.18 Add `DiagramStyleBar.tsx` (type, direction, colour, style, font) that rewrites the settings lines in the code.
- [ ] 2.19 Show the notice "Shapes in this diagram are redrawn from its code" the first time someone drags a shape inside a diagram.
- [ ] 2.20 Write the syntax help page `Docs/diagram-syntax.md`, and link to it from the panel.
- [ ] 2.21 Write a failing test, then make it pass: for a viewer (read-only file or share link) the code panel is read-only and the style bar and Diagram button are hidden.
- [ ] 2.22 Write a failing test: label text on every colorMode fill reaches 4.5:1 contrast in both light and dark canvas themes.
- [ ] 2.23 Show the code panel as a bottom sheet at ≤ 767px (canvas still visible above it), as in the prototype.
- [ ] 2.24 Smoke test that Excalidraw's built-in "paste Mermaid" still works and turns into normal shapes, not a typed diagram.
- [ ] 2.25 Smoke test in the browser: type a 15-node cloud diagram, change every style option, undo and redo, copy and paste the diagram, save, reload, export PNG and SVG.

**Verify:** all parser, layout and render tests pass. With the code panel open, typing stays smooth on a 150-node diagram, and a reload shows the same diagram.

## Stage 3 — Cloud icons (full sets)

- [ ] 3.1 [User] Download the official icon packs and accept their terms (AWS Architecture Icons, Azure Architecture Icons, Google Cloud icons, Kubernetes community icons); Azure needs a terms click-through only a person can accept.
- [ ] 3.2 Write `scripts/build-icons.mjs`. It reads the downloaded zips and writes optimised SVGs to `public/icons/<provider>/<name>.svg`, plus `public/icons/manifest.json` with id, provider, label and keywords.
- [ ] 3.3 Write failing tests for the icon registry: lookup by exact id, search by keyword, unknown name → the generic fallback icon plus an error.
- [ ] 3.4 Implement `getIcon(id)` and `searchIcons(query, limit)` in `lib/diagram/icons/registry.ts` (loads the manifest once, lazily).
- [ ] 3.5 Draw `icon:` attributes as Excalidraw image elements whose file id is `icon:<id>`, filled from `public/icons` on load and on paste.
- [ ] 3.6 Add icon names to the code panel's autocomplete (top 20 matches with previews).
- [ ] 3.7 Add an icon picker in the style bar that inserts `icon: <id>` on the selected node's line.
- [ ] 3.8 Add the Kubernetes CC-BY-4.0 attribution and the AWS, Microsoft and Google icon notices to `app/privacy` (or a new credits section).
- [ ] 3.9 Measure the manifest size and the icon load on a 50-icon diagram; keep the manifest under 300 KB gzipped.

**Verify:** every icon id in the manifest resolves, missing icons fall back, and the editor's first load doesn't download the icon files.

## Stage 4 — Sequence diagrams

- [ ] 4.1 Write failing parser tests for participants, messages (solid and dashed), activation, and loop/alt/opt/par blocks with labels and nesting.
- [ ] 4.2 Implement `parseSequence(code): ParseResult<SequenceModel>` in `lib/diagram/parse/sequence.ts`.
- [ ] 4.3 Write failing layout tests: participant columns in order of first use, message rows top to bottom, block frames around their rows, activation bars.
- [ ] 4.4 Implement `layoutSequence(model, settings): PositionedSequence` in `lib/diagram/layout/sequence.ts` (plain column/row maths; ELK is not used).
- [ ] 4.5 Implement `toSequenceSkeletons(positioned, settings, origin)` in `lib/diagram/render/sequence.ts`, with tests.
- [ ] 4.6 Register the sequence type in the block, panel autocomplete and style bar, with a starter template.

**Verify:** a 12-participant, 60-message fixture draws with no overlaps, and its lifelines stretch to the last message.

## Stage 5 — ER diagrams — Opus (hard)

- [ ] 5.1 Write failing parser tests: tables, columns with type and pk/fk/unique flags, all three relation kinds, relations to unknown columns → an error.
- [ ] 5.2 Implement `parseEr(code): ParseResult<ErModel>` in `lib/diagram/parse/er.ts`.
- [ ] 5.3 Implement `layoutEr` in `lib/diagram/layout/er.ts` (ELK layered, one port per column), with tests.
- [ ] 5.4 Implement `toErSkeletons` in `lib/diagram/render/er.ts`, drawing tables as header plus row stacks with crow's-foot arrowheads (Excalidraw 0.18), with tests.
- [ ] 5.5 Register the ER type in the block, panel and style bar, with a starter template.

**Verify:** the app's own `files`, `teams`, `team_members` and `file_shares` schema draws correctly from a fixture.

## Stage 6 — BPMN diagrams — Opus (hard)

- [ ] 6.1 Write failing parser tests: pools, lanes, the node kinds task/event/start/end/gateway/subprocess, edges between lanes.
- [ ] 6.2 Implement `parseBpmn(code): ParseResult<BpmnModel>` in `lib/diagram/parse/bpmn.ts`.
- [ ] 6.3 Implement `layoutBpmn` in `lib/diagram/layout/bpmn.ts` (ELK layered with partitioning, one partition per lane), with tests.
- [ ] 6.4 Implement `toBpmnSkeletons` in `lib/diagram/render/bpmn.ts` (swimlane bands, gateway diamonds, event circles), with tests.
- [ ] 6.5 Register the BPMN type in the block, panel and style bar, with a starter template.

**Verify:** a 3-lane, 20-step fixture keeps every step inside its own lane.

## Stage 7 — Dashboard and other app pages

- [ ] 7.1 Rebuild the dashboard sidebar to the Graphite prototype: workspace switcher, All / Recent / Shared / Starred / Archive, teams with counts, plan meter, Getting started, user row.
- [ ] 7.2 Make the sidebar a drawer at ≤ 1023px (menu button, scrim, Escape to close, focus return).
- [ ] 7.3 Rebuild the file list as the Graphite table (name, location, edited, author, ⋯ menu), stacking into rows at ≤ 639px.
- [ ] 7.4 Add the grid view with diagram thumbnails generated from each file's whiteboard (`exportToSvg` at small size, cached).
- [ ] 7.5 Keep the existing search, filters, select mode, drag-and-drop, rename, duplicate, archive and delete working in the new layout, with tests updated.
- [ ] 7.6 Rebuild the New file dialog (name with a visible label, team select).
- [ ] 7.7 Add the empty states "No files yet" and "No files match".
- [ ] 7.8 Restyle the team create page, the invite page and the privacy page.
- [ ] 7.9 Add migration `file_stars` (`user_id`, `file_id`, primary key on both) with RLS (a user sees and changes only their own stars; grants to `authenticated` only), checked with `supabase/tests/rls.sql`.
- [ ] 7.10 Add `lib/data/stars.ts` with `listStarred(db)`, `starFile(db, fileId)` and `unstarFile(db, fileId)`, plus tests.
- [ ] 7.11 Add a Star toggle to the file row menu and fill the Starred view from it.
- [ ] 7.12 Make the Recent view list files by last edited time (`updated_at`, newest first); no new tracking is needed.
- [ ] 7.13 Replace the prototype's "3 of 5 free files" meter with a plain file count (no plan limits exist yet; see `Plan/later-backlog.md`).
- [ ] 7.14 Restyle the 404 and error pages.
- [ ] 7.15 [User] Judge the dashboard on the live site against the prototype (needs a human eye).

**Verify:** the browser check passes, every file action still works, and a 40-file account shows no layout breaks.

## Stage 8 — Login screens

- [ ] 8.1 Rebuild the login page to the Graphite split layout (form left, product visual right, hidden at ≤ 1023px).
- [ ] 8.2 Rebuild the sign-up page with the live password-rule hint.
- [ ] 8.3 Rebuild the forgot-password page with the "Check your email" state.
- [ ] 8.4 Rebuild the update-password page with an inline mismatch error.
- [ ] 8.5 Show every error next to its field (`aria-describedby`), and keep the Google sign-in banner error.
- [ ] 8.6 Check the existing auth tests still pass after the restyle, and fix any that fail.
- [ ] 8.7 [User] Sign in with Google and with email on the live site after deploy (needs your real Google account).

**Verify:** all four pages pass the browser check at 320 to 1280, fields use 16px text on phones, and sign-in works end to end.

## Stage 9 — Landing page

- [ ] 9.1 Rebuild the landing hero (centred headline, CTAs, product visual) in `app/page.tsx` and `app/_components/Hero.tsx`.
- [ ] 9.2 Replace the prototype's drawn diagram with a real render from `lib/diagram` (static SVG generated at build time).
- [ ] 9.3 Add the "Type it. See it." section, the features grid, pricing (from the existing pricing section), the final call to action and the footer.
- [ ] 9.4 Add metadata, a social preview image and the `BRAND_NAME` title.
- [ ] 9.5 [User] Confirm the pricing numbers and plan limits shown on the page (business decision; paying is not built yet, see `Plan/later-backlog.md`).
- [ ] 9.6 Delete the old design pieces nothing uses any more (for example `components/ui/design-system-showcase.tsx` and old token colours), after checking for callers with GitNexus.
- [ ] 9.7 Update `README.md` for the new name, the diagram feature and the syntax help page.

**Verify:** the browser check passes, Lighthouse performance is at least 90 on mobile, and the page works without JavaScript for the hero.

## Final verification (every stage)

- `npx tsc --noEmit`, `npm test` and `npm run build` are green.
- A browser smoke test of the changed screens covers both modes, worst-case content and widths 320–1280.
- `rls-security-reviewer` runs after every migration or data-layer change, and `types/database.ts` is regenerated after every migration.
- `mcp__gitnexus__detect_changes` runs before each commit and shows only the expected symbols.
- Deploy with the eraser-deploy skill after each shipped stage, then hand the user the stage's `[User]` check.
