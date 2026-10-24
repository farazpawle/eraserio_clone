---
Title: Stage 1 step plan — New editor (Graphite shell)
Description: Test-first step plan for Stage 1 of the Graphite redesign. Rebuilds the editor header, the Document/Both/Canvas view switch, document and canvas styling,
  export menu, share dialog and shared view; fixes the Save button's repeat-save behaviour; and stores pasted canvas images in a private Supabase bucket so they survive
  a reload (new migration, RLS tests, shared-link routes). Decisions from the user on 2026-10-24: email invite = team invitation, keep the Save button and add a status.
  Master list is Plan/redesign-eraser-canvas-tasks.md (tasks 1.1-1.19).
Total Tasks: 13
Status: Draft, awaiting user review
Updated: 2026-10-24
---

# Stage 1 — New editor (Graphite shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Graphite editor shell (header, Document/Both/Canvas, styled panes, share dialog) and make pasted canvas images survive a reload.

**Architecture:** A small `WorkspaceLayout` keeps both panes mounted and shows one or both based on a per-file view saved in localStorage; the logged-in editor page and the shared-link page both use it. Panes report save state upward and save on a counter signal instead of a boolean. Canvas images live in a private Storage bucket `canvas-files` at `<file id>/<excalidraw file id>`; logged-in users reach it through RLS, link holders through server routes that re-check the token.

**Tech Stack:** Next.js 14.2.35, React 18, `@excalidraw/excalidraw` 0.18.1, Editor.js, Supabase Storage, Tailwind with the `g-*` Graphite colour names, Jest + Testing Library. No new packages.

**Spec:** `Plan/redesign-eraser-canvas-plan.md` (decisions, constraints), `Plan/redesign-eraser-canvas-tasks.md` Stage 1 (tasks 1.1–1.19), approved look `designs/redesign/editor.html` (Graphite look only).

## Decisions made while planning

| Topic | Decision | By |
|---|---|---|
| Share dialog "Invite by email" | Creates a **team** invitation with the existing `sendInvitation`, copies the `/invite/<token>` link (same as the team invite window). The dialog says the person will see every file in the team. Role choice: Viewer (default) or Member. | User |
| Saving | Keep the Save button and the save shortcut. A status label next to it shows Unsaved changes / Saving… / Saved / Save failed. No autosave. | User |
| Save button repeat-save | The panes save when `onSaveTrigger` is truthy and re-run that effect whenever their save callback changes, so after the first Save press the canvas appears to save on every change, and every second press does nothing (the flag toggles back to false). Replaced by a counter signal. Confirm with the failing test in Task 3 before relying on this reading. | Agent |
| Share dialog links | Keep the existing multi-link list (permission, expiry, copy, revoke) restyled, instead of the prototype's single "anyone with the link" select. Dropping expiry and revoke would remove working features. | Agent |
| Header avatars | Show only the signed-in user's avatar. The prototype's three avatars are live presence, which is a later stage. | Agent |
| Export on phones | Icon-only Export and Share at ≤ 639px instead of hiding Export as the prototype does (people would lose export on phones). | Agent |
| Hidden panes | Both panes stay mounted and the hidden one gets `display: none`, so Editor.js and Excalidraw keep their unsaved state. | Agent |
| Document blocks | Only headings, paragraphs, lists and checklists exist in Editor.js today. Style those, add heading level 1, and leave the prototype's callout and code blocks out (they need new Editor.js packages). Add them to `Plan/later-backlog.md`. | Agent |
| Canvas background | No dot grid (Excalidraw cannot draw dots). Canvas background matches `--g-bg`. Flag at the human look check (1.19). | Agent |
| View shortcuts | Fixed keys Alt+1 / Alt+2 / Alt+3 for Document / Both / Canvas, registered by the page. They are not added to the customisable shortcut list, because saved settings replace that list entirely. | Agent |
| Orphan images | `deleteFile` removes the file's images best-effort. Deleting a whole team leaves them behind (`ponytail:` comment, backlog). | Agent |

## Global Constraints

- Login and data through Supabase only; clients from `lib/supabase/{client,server,admin}.ts`; queries in `lib/data/*` with the client as first argument.
- New storage policies in their **own migration**, bucket private, policies `to authenticated` only, never `anon`. Run `supabase/tests/rls.sql` before applying. Never edit an applied migration.
- `SUPABASE_SERVICE_ROLE_KEY` only through `lib/supabase/admin.ts` in server code (the shared-link routes).
- Excalidraw and Editor.js load through `next/dynamic` with `ssr: false`.
- Graphite tokens are `--g-*` in `app/globals.css`; Tailwind names are `g-bg`, `g-panel`, `g-panel-2`, `g-hover`, `g-line`, `g-line-2`, `g-text`, `g-muted`, `g-faint`, `g-accent`, `g-accent-ink`, `g-accent-soft`, `g-danger`, `g-ok`.
- Breakpoints 475 / 640 / 768 / 1024 / 1280. Text contrast 4.5:1 in both themes; tap targets ≥ 44px at ≤ 767px; no sideways scroll at 320px; `prefers-reduced-motion` respected.
- Tests live in `Tests/<feature>/`. Checks per task: `npx tsc --noEmit` and the task's tests; after Tasks 5, 9, 12 and at the end: `npm test` and `npm run build`. ESLint is not set up.
- Once per session run `gitnexus list` to get this repo's name, then pass `repo` on every GitNexus call. Before editing behaviour of an existing function or component, run `mcp__gitnexus__impact` (upstream) and report HIGH or CRITICAL risk before editing. Before every commit run `mcp__gitnexus__detect_changes`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Storage blocked.** In a private window `localStorage` throws; the view falls back to Both and the editor still opens (Task 1 test).
2. **Bad image.** An image over 5 MB or of an unsupported type fails the save with a clear message and does **not** save the element list, so nothing is half-saved (Tasks 5, 6, 11 tests).
3. **Wrong writer.** A viewer cannot upload to the bucket; a view-only or expired share link cannot upload through the route; a key like `../x` is refused (Tasks 4 and 11 tests).
4. **Missing image on open.** A stored object that no longer exists loads the rest of the canvas and leaves a placeholder, no crash (Task 6 test).
5. **Long or empty file name.** A 200-character name with no spaces does not break the header at 320px; an empty rename is rejected and the old name comes back (Task 8 test, Task 13 browser check).

## File Structure

| File | Responsibility |
|---|---|
| `app/_hooks/useEditorView.ts` (new) | per-file view choice, narrow-screen rule |
| `app/_hooks/useSaveStatus.ts` (new) | combines doc + canvas save state; `useSaveSignal` runs a save once per counter change |
| `components/ui/resizable-pane.tsx` (edit) | new `show` prop |
| `app/(routes)/workspace/_components/WorkspaceLayout.tsx` (new) | header slot + banner slot + two panes, shared by both pages |
| `app/(routes)/workspace/_components/WorkspaceStates.tsx` (new) | Graphite loading skeleton and file-not-found state |
| `app/(routes)/workspace/_components/WSHeader.tsx` (rewrite) | header assembly |
| `app/(routes)/workspace/_components/{FileNameField,ViewSwitch,ExportMenu,UserMenu}.tsx` (new) | header pieces |
| `app/(routes)/workspace/_components/{Editor,WSCanvas}.tsx` (edit) | save signal, status, image store, scene ref |
| `app/(routes)/workspace/workspace.css` (new) | Graphite document pane and Excalidraw theme, scoped under `.ws-doc` and `.ws-canvas` |
| `lib/data/canvasFiles.ts` (new) | image store interface, Supabase store, shared-link functions, delete |
| `lib/canvas/persist.ts` (new) | `persistCanvas`, `loadSceneFiles`, `referencedFileIds` |
| `lib/canvas/export.ts` (new) | PNG/SVG export that passes images through |
| `app/api/shared/[token]/files/[key]/route.ts` (new) | GET/PUT image for link holders |
| `components/ui/file-share-modal.tsx` (rewrite) | Graphite share dialog with team invite |
| `supabase/migrations/<ts>_canvas_files.sql` (new) | bucket + policies |

---

### Task 1: View hook (covers 1.2)

**Files:**
- Create: `app/_hooks/useEditorView.ts`
- Test: `Tests/workspace/useEditorView.test.tsx`

**Interfaces:**
- Produces: `type EditorView = 'doc' | 'both' | 'canvas'`; `readStoredView(fileId: string): EditorView`; `effectiveView(view: EditorView, narrow: boolean): EditorView`; `useEditorView(fileId: string): { view: EditorView; shown: EditorView; setView(v: EditorView): void; narrow: boolean }`. `view` is the person's choice, `shown` is what the layout draws.

- [ ] **Step 1: Write the failing tests.** `readStoredView` returns `'both'` when nothing is stored, when the value is junk (`'sideways'`), and when `localStorage.getItem` throws (spy it to throw). It returns `'canvas'` after `localStorage.setItem('draftboard:view:f1','canvas')`. `effectiveView('both', true) === 'doc'`; `effectiveView('canvas', true) === 'canvas'`; `effectiveView('both', false) === 'both'`. Hook: `setView('doc')` stores under `draftboard:view:f1`, returns `view 'doc'`; with `setItem` throwing, `setView('doc')` still updates `view` and does not throw.
- [ ] **Step 2:** Run `npx jest Tests/workspace/useEditorView.test.tsx`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the four exports in `app/_hooks/useEditorView.ts`. Wrap every storage read and write in try/catch. Read the stored view in a `useEffect` on `fileId` (state starts at `'both'`) so server rendering matches. `narrow` follows `window.matchMedia('(max-width: 767px)')` with a change listener, `false` when `matchMedia` is missing.
- [ ] **Step 4:** Run the test file. Expected: PASS. Run `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: per-file editor view hook (stage 1.2)`.

---

### Task 2: Layout and pane visibility (covers 1.3)

**Files:**
- Modify: `components/ui/resizable-pane.tsx`
- Create: `app/(routes)/workspace/_components/WorkspaceLayout.tsx`
- Test: `Tests/workspace-improvements/ResizablePane.test.tsx` (add cases), `Tests/workspace/WorkspaceLayout.test.tsx`

**Interfaces:**
- Consumes: `EditorView` from Task 1.
- Produces: `ResizablePane` prop `show?: 'both' | 'left' | 'right'` (default `'both'`); `WorkspaceLayout({ header: ReactNode; banner?: ReactNode; doc: ReactNode; canvas: ReactNode; shown: EditorView; initialLeftWidth?: number })`.

- [ ] **Step 1: Write the failing tests.** ResizablePane: with `show="left"` the right panel's wrapper and the resizer have the `hidden` class and the left wrapper style width is `100%`, and both `left-panel` and `right-panel` test ids are still in the document (still mounted). With `show="right"` the mirror. Default `show` renders as today (existing cases stay green). WorkspaceLayout: `shown="doc"` hides the canvas wrapper, `shown="canvas"` hides the doc wrapper, `shown="both"` shows both and the left width is 40 by default; header and banner render above the panes.
- [ ] **Step 2:** Run both files. Expected: FAIL on the new cases.
- [ ] **Step 3: Implement** `show` in `ResizablePane` (hide with Tailwind `hidden`, never unmount). Implement `WorkspaceLayout` as a `flex h-screen flex-col bg-g-bg` with the header, optional banner, and a `min-h-0 flex-1` body holding `ResizablePane` (`minLeftWidth` 20, `maxLeftWidth` 80, existing snap points, resizer classes using `g-line` / `g-accent`). `shown` maps to `show`: `doc → left`, `canvas → right`, `both → both`. Wrap `doc` in `<div className="ws-doc h-full overflow-auto">` and `canvas` in `<div className="ws-canvas h-full">`. The body does not use the old `calc(100vh - 73px)`.
- [ ] **Step 4:** Run both files and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: workspace layout with view-driven panes (stage 1.3)`.

---

### Task 3: Save signal and status

**Files:**
- Create: `app/_hooks/useSaveStatus.ts`
- Test: `Tests/workspace/useSaveStatus.test.tsx`

**Interfaces:**
- Produces: `type SavePart = 'doc' | 'canvas'`; `type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'`; `combineStatus(parts: Record<SavePart, SaveState>): SaveState` (priority error > saving > unsaved > saved); `useSaveStatus(): { status: SaveState; report(part: SavePart, state: SaveState): void }`; `useSaveSignal(signal: number | undefined, save: () => void): void`.

- [ ] **Step 1: Write the failing tests.** `combineStatus` returns each priority correctly (e.g. `{doc:'unsaved',canvas:'saving'} → 'saving'`, `{doc:'saved',canvas:'error'} → 'error'`, both saved → `'saved'`). `useSaveStatus` starts `'saved'`; `report('doc','unsaved')` → `'unsaved'`; then `report('doc','saved')` → `'saved'`. `useSaveSignal`: with `save = jest.fn()`, mount with signal `0` → not called; rerender signal `1` → called once; rerender with the same signal but a new `save` function → still once; rerender signal `2` → twice; `signal === undefined` never calls.
- [ ] **Step 2:** Run `npx jest Tests/workspace/useSaveStatus.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the three exports. `useSaveSignal` keeps the last handled signal and the latest `save` in refs and fires only when the signal value changes. If the second rerender case fails in the old code path, that confirms the repeat-save reading in the decisions table.
- [ ] **Step 4:** Run the file and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: save status and one-shot save signal (stage 1)`.

---

### Task 4: Storage migration and RLS tests (covers 1.8, 1.11, 1.12)

**Files:**
- Create: `supabase/migrations/<timestamp>_canvas_files.sql` (via `npx supabase migration new canvas_files`)
- Modify: `supabase/tests/rls.sql`

**Interfaces:**
- Produces: private bucket `canvas-files` (5 MiB limit; types `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`); object name rule `<files.id>/<excalidraw file id>`; helper `private.canvas_file_id(text) returns uuid`.

- [ ] **Step 1: Check the local database has Storage tables.** Run `npx supabase db start`, then `select to_regclass('storage.objects'), to_regclass('storage.buckets')`. If either is null the local database cannot test this migration: run the checks on the VPS inside the rolled-back transaction described in the `eraser-supabase-db` skill instead, and say so in the task notes.
- [ ] **Step 2: Write the failing RLS cases** in `supabase/tests/rls.sql` using the existing helpers, with A the owner, B the outsider, C the viewer, anon signed out. As A (after the file is created): insert into `storage.objects` (`bucket_id 'canvas-files'`, `name file_id || '/abc123'`) succeeds; a name whose first part is not a real file id is refused; a name like `file_id || '/../x'` is refused. As B: select returns 0 rows, insert is `refused`, update/delete change 0 rows. As C (after `accept_invitation`): select returns 1 row, insert is `refused`, delete changes 0 rows. As anon: select returns 0 rows, insert is `refused`. Run `rls.sql`. Expected: FAIL (no bucket or policies).
- [ ] **Step 3: Write the migration.** Insert the bucket with `on conflict (id) do nothing`, `public = false`, the size limit and mime list above. Add `private.canvas_file_id(p_name text) returns uuid`: `language sql immutable set search_path = ''`, returns the first path part cast to uuid only when the whole name matches `^<uuid>/[A-Za-z0-9_-]{1,64}$`, otherwise null; revoke execute from `public, anon`, grant to `authenticated`. Policies on `storage.objects`, all `to authenticated`: **select** when `bucket_id = 'canvas-files'` and a row exists in `public.files` with `id = private.canvas_file_id(name)` (files' own RLS limits this to team members); **insert / update / delete** when the same holds and `private.team_role(f.team_id) in ('owner','admin','member')`. Insert and update use `with check` as well as `using`.
- [ ] **Step 4:** Re-run `rls.sql` locally (or on the VPS). Expected: `RLS tests passed`. Run `rls-security-reviewer` on the migration and `rls.sql`; fix anything it reports.
- [ ] **Step 5: Ask the user, then apply to the live database** with the `eraser-supabase-db` skill; regenerate `types/database.ts` and confirm the diff is empty or only whitespace (storage tables are not in the generated public types). Confirm the Storage service answers on the VPS (upload and delete one test object through the skill's route) before moving on.
- [ ] **Step 6: Commit** `feat: canvas-files bucket with RLS (stage 1.8, 1.11, 1.12)`.

---

### Task 5: Image store (covers 1.9)

**Files:**
- Create: `lib/data/canvasFiles.ts`
- Modify: `lib/data/files.ts` (`deleteFile` cleanup)
- Test: `Tests/data/canvasFiles.test.ts`, `Tests/data/files.test.ts` (one added case)

**Interfaces:**
- Consumes: bucket and name rule from Task 4; `Db`, `unwrap`, `DataError` from `lib/data/db.ts`; `BinaryFileData` from `@excalidraw/excalidraw/types` (type import only).
- Produces:
  - `CANVAS_BUCKET = 'canvas-files'`, `MAX_CANVAS_FILE_BYTES = 5 * 1024 * 1024`, `CANVAS_MIME_TYPES: readonly string[]`, `FILE_KEY = /^[A-Za-z0-9_-]{1,64}$/`.
  - `interface CanvasFileStore { load(ids: string[]): Promise<BinaryFileData[]>; save(file: BinaryFileData): Promise<void> }`.
  - `supabaseCanvasFileStore(db: Db, fileId: string): CanvasFileStore`.
  - `deleteCanvasFiles(db: Db, fileId: string): Promise<void>`.
  - `dataUrlToBlob(dataUrl: string): Blob`, `blobToDataUrl(blob: Blob): Promise<string>`.

- [ ] **Step 1: Write the failing tests** with a small stand-in `db.storage.from(bucket)` object in the test file (the shared `fakeDb` has no storage). Cases: `save` uploads to `f1/<id>` with `{ contentType: file.mimeType, upsert: false }`; `save` treats an "already exists" error (`statusCode '409'`) as success; `save` rejects with a `DataError` for any other error; `save` rejects before uploading when the decoded blob is over 5 MiB or the mime type is not in `CANVAS_MIME_TYPES`; `load(['a','b'])` where `b` is missing returns only `a` (data URL rebuilt, `id` and `mimeType` kept) and does not throw; `load([])` makes no storage call; `deleteCanvasFiles` lists `f1/` and removes every listed object in one `remove` call, and does nothing when the list is empty. In `files.test.ts`: `deleteFile` still resolves when `deleteCanvasFiles` throws (image cleanup is best-effort).
- [ ] **Step 2:** Run both files. Expected: FAIL.
- [ ] **Step 3: Implement** the exports above. `deleteFile` calls `deleteCanvasFiles` after the row delete inside try/catch with a `console.warn`; add the `ponytail:` comment that deleting a team leaves its images behind.
- [ ] **Step 4:** Run both files, then `npx tsc --noEmit` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: canvas image store (stage 1.9)`.

---

### Task 6: Save and load a scene with its images (covers 1.7)

**Files:**
- Create: `lib/canvas/persist.ts`, `lib/canvas/export.ts`
- Test: `Tests/canvas/persist.test.ts`, `Tests/canvas/export.test.ts`

**Interfaces:**
- Consumes: `CanvasFileStore` (Task 5); element and `BinaryFiles` types from `@excalidraw/excalidraw/element/types` and `@excalidraw/excalidraw/types` (type imports only).
- Produces:
  - `type Scene = { elements: readonly ExcalidrawElement[]; files: BinaryFiles }`.
  - `referencedFileIds(elements): string[]` (non-deleted image elements with a `fileId`, unique).
  - `persistCanvas(deps: { store: CanvasFileStore; uploaded: Set<string>; saveElements(content: Json): Promise<void> }, scene: Scene): Promise<void>`.
  - `loadSceneFiles(deps: { store: CanvasFileStore; uploaded: Set<string> }, elements: readonly ExcalidrawElement[]): Promise<BinaryFiles>`.
  - `exportCanvas(format: 'png' | 'svg', scene: Scene, fileName: string): Promise<void>`.

- [ ] **Step 1: Write the failing tests.** `persistCanvas`: with two image elements (one deleted) and `files` holding both, only the live one is uploaded; an id already in `uploaded` is skipped; elements are saved **after** uploads and the saved value is the element array; when `store.save` rejects, `persistCanvas` rejects and `saveElements` was never called; successful ids are added to `uploaded`. `loadSceneFiles`: requests only referenced ids; returns a record keyed by id; adds loaded ids to `uploaded`; skips the store when nothing is referenced; a store that returns fewer files than requested (missing object) yields a partial record, no throw. `exportCanvas` (mock `@excalidraw/excalidraw`): `exportToSvg` and `exportToCanvas` are called with `files` equal to `scene.files` (today they get `{}`, so images vanish from exports); the downloaded name is `generateExportFileName(fileName)` plus `.png` or `.svg`.
- [ ] **Step 2:** Run both files. Expected: FAIL.
- [ ] **Step 3: Implement.** Move the PNG and SVG code from `WSCanvas.tsx` into `exportCanvas` unchanged apart from passing `files`; keep the fixed 1920×1080 dimensions (behaviour "as today"). Load the Excalidraw module with `await import('@excalidraw/excalidraw')` inside the function.
- [ ] **Step 4:** Run both files and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: persist canvas scenes with images (stage 1.7)`.

---

### Task 7: Wire the panes (covers 1.6 part, 1.10)

**Files:**
- Modify: `app/(routes)/workspace/_components/WSCanvas.tsx`, `app/(routes)/workspace/_components/Editor.tsx`
- Test: `Tests/workspace/WSCanvas.test.tsx`, `Tests/workspace/Editor.test.tsx`

**Interfaces:**
- Consumes: `useSaveSignal`, `SaveState` (Task 3); `CanvasFileStore`, `supabaseCanvasFileStore` (Task 5); `persistCanvas`, `loadSceneFiles`, `Scene` (Task 6).
- Produces: both panes take `saveSignal?: number` and `onStatus?: (state: SaveState) => void` and **no longer** take `onSaveTrigger` or `triggerSave`. `WSCanvas` also takes `fileStore?: CanvasFileStore` (default: Supabase store for `fileId`) and `sceneRef?: MutableRefObject<Scene | null>` (kept current on every change, used by the header's Export).

- [ ] **Step 1: Run impact.** `mcp__gitnexus__impact` upstream on `WSCanvas` and `Editor`; report callers (the workspace page, the shared page, the loading test mocks).
- [ ] **Step 2: Write the failing tests** (mock `@excalidraw/excalidraw` as a component that exposes its `onChange` prop; mock `persistCanvas`). WSCanvas: calling `onChange(elements, appState, files)` writes `{ elements, files }` to `sceneRef`; changing the saveSignal calls `persistCanvas` once with both the elements and the files; the same signal with a new elements array does **not** save again; status goes `saving` then `saved`, or `error` on rejection; the first `onChange` after open does not report `unsaved`, a later one with a different `getSceneVersion` does; `readOnly` never reports `unsaved`. Editor: changing the signal saves once; a second signal saves again; status reports follow save results.
- [ ] **Step 3:** Run the two files. Expected: FAIL.
- [ ] **Step 4: Implement.** In `WSCanvas`: load images before mounting Excalidraw (`loadSceneFiles`, then `initialData={{ elements, files }}`), showing `CanvasLoading` meanwhile and a toast if loading fails; delete the fake one-second delay and the old in-canvas Export dropdown and its PNG/SVG functions (export moves to the header, Task 8); save through `useSaveSignal` calling `persistCanvas` with `saveElements` = `onSave ?? saveWhiteboard(db, fileId, …)`; keep one `uploaded` set in a ref; remove the "Saving canvas…" corner indicator (the header status label from Task 9 replaces it; `ProgressIndicator` stays for other users). In `Editor`: switch to `useSaveSignal`; report `unsaved` from Editor.js `onChange` only after `isReady` (skip the first event if the library fires one on load); heading `levels: [1, 2, 3, 4]`, default level stays 3.
- [ ] **Step 5:** Run the two files and `npx tsc --noEmit`. Expected: PASS. `npm test` may show the page tests failing on the removed props; they are fixed in Task 9.
- [ ] **Step 6: Commit** `feat: panes save on a signal and keep canvas images (stage 1.10)`.

---

### Task 8: Header pieces (covers 1.1 part, 1.6, 1.17)

**Files:**
- Create: `app/(routes)/workspace/_components/{FileNameField,ViewSwitch,ExportMenu,UserMenu}.tsx`
- Test: `Tests/workspace/{FileNameField,ViewSwitch,ExportMenu,UserMenu}.test.tsx`

**Interfaces:**
- Consumes: `EditorView` (Task 1); `Scene`, `exportCanvas` (Task 6); `useExportContext().exportSingleFile` (existing); `useTheme()` (existing); `AppUser` from `hooks/useUser`.
- Produces:
  - `FileNameField({ name: string; editable: boolean; onCommit(name: string): Promise<void> })`.
  - `ViewSwitch({ value: EditorView; onChange(v: EditorView): void; narrow: boolean })`.
  - `ExportMenu({ file: FileRow; getScene(): Scene | null })`.
  - `UserMenu({ user: AppUser | null })`.

- [ ] **Step 1: Write the failing tests.**
  - `FileNameField`: not editable → plain text, no input. Editable: click shows an input (`maxLength` 200, label "File name"); Enter with a changed non-empty name calls `onCommit('New name')` with the trimmed value; Enter or blur with the same name does not call it; empty or spaces-only does not call it and the old name shows again; Escape cancels; when `onCommit` rejects the old name shows again and `toast.error` is called.
  - `ViewSwitch`: three `role="tab"` buttons Document / Both / Canvas with `aria-selected` on the current one; clicking calls `onChange`; ArrowRight and ArrowLeft move selection; with `narrow` the Both tab is not rendered.
  - `ExportMenu`: items "Document as PDF", "Canvas as PNG", "Canvas as SVG". PDF calls `exportSingleFile(file, 'pdf')`. PNG/SVG call `exportCanvas` with `getScene()`; when `getScene()` is null they are disabled; when the scene has no live elements they are disabled.
  - `UserMenu`: avatar button opens a menu with Light, Dark, System and "Back to dashboard"; choosing Dark calls `setTheme('dark')`; the current theme shows a check; "Back to dashboard" calls `router.push('/dashboard')`; with `user` null it renders nothing.
- [ ] **Step 2:** Run the four files. Expected: FAIL.
- [ ] **Step 3: Implement** each component using the existing `DropdownMenu` primitives and Graphite classes (`g-panel`, `g-line`, `g-hover`, `g-text`, `g-muted`). Every button is at least 36px high on desktop and 44px at ≤ 767px (`max-md:min-h-11 max-md:min-w-11`). Export and Share labels collapse to icons at ≤ 639px but keep an `aria-label`. `FileNameField` truncates with `truncate min-w-0`.
- [ ] **Step 4:** Run the four files and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: editor header pieces (stage 1.1, 1.6, 1.17)`.

---

### Task 9: Header assembly, pages and shortcuts (covers 1.1, 1.3, 1.14 structure, 1.15, 1.16)

**Files:**
- Rewrite: `app/(routes)/workspace/_components/WSHeader.tsx`
- Modify: `app/(routes)/workspace/[fileId]/page.tsx`, `app/(routes)/shared/[token]/SharedFileView.tsx`
- Test: `Tests/workspace/WSHeader.test.tsx`, `Tests/workspace/WorkspacePage.test.tsx`; update `Tests/workspace-improvements/WorkspaceLoading.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–3, 7, 8; `renameFile`, `listMyTeams` (existing).
- Produces: `WSHeader({ fileName: string; teamName?: string; fileData?: FileRow; readOnly?: boolean; view: EditorView; narrow: boolean; onViewChange(v): void; status: SaveState; onSave(): void; onRename?(name: string): Promise<void>; getScene(): Scene | null; user?: AppUser | null })`.

- [ ] **Step 1: Run impact** on `WSHeader` (callers: workspace page, shared view) and `Workspace` page; report risk.
- [ ] **Step 2: Write the failing tests.** `WSHeader`: shows logo link to `/dashboard`, team name then `/` then the file name field, the view switch, the status label text (`Unsaved changes`, `Saving…`, `Saved`, `Save failed`), Save button calling `onSave`, Export and Share only when `fileData` is given; `readOnly` hides Save, status, rename, Share and Export. Page (real `WSHeader` and `WorkspaceLayout`, mocked panes): the page loads the file, shows the team name from `listMyTeams`, defaults to Both; clicking Canvas hides the doc wrapper; pressing the registered Alt+1 / Alt+2 / Alt+3 shortcuts (call the `action` passed to `registerShortcuts`) switches view; the save shortcut action and the Save button each bump the signal passed to both panes by 1 (so two presses are two saves); renaming calls `renameFile(db, id, name)` and the header shows the new name.
- [ ] **Step 3:** Run both files. Expected: FAIL.
- [ ] **Step 4: Implement.** `WSHeader` follows the prototype header (52px; logo, breadcrumb, `ViewSwitch`, right group); team name and the status label hide at ≤ 1023px as in the prototype; the status label has `aria-live="polite"`. The workspace page replaces the boolean `triggerSave` with a counter, uses `useEditorView`, `useSaveStatus` (panes get `onStatus={(s) => report('doc' | 'canvas', s)}`), a `sceneRef`, and `WorkspaceLayout`; it registers Alt+1/2/3 together with the existing save shortcut in the same `registerShortcuts` call. Team name: `listMyTeams(db)` once, matched on `file.team_id`, failure ignored. `SharedFileView` moves onto `WorkspaceLayout` with `WSHeader readOnly`-style props and a Graphite-styled access banner (permission pill: View / Comment / Edit; "Read-only" note for non-edit links); edit-link holders keep Save and status; its `saveVia` callbacks are wrapped in `useCallback`/`useMemo` so they are stable.
- [ ] **Step 5: Update existing tests (1.16).** Run `npx jest Tests/workspace-improvements Tests/workspace`. Fix only what the rebuild legitimately broke in `WorkspaceLoading.test.tsx` (the `WorkspaceLayout`/`ResizablePane` mock, the exact skeleton count `14` becomes "at least one"); keep the strings `Loading your workspace...`, `Failed to Load File` and the test ids the tests use.
- [ ] **Step 6:** Run `npx tsc --noEmit`, `npm test`, `npm run build`. Expected: all pass.
- [ ] **Step 7: Commit** `feat: Graphite editor header and view switching (stage 1.1, 1.3, 1.15, 1.16)`.

---

### Task 10: Share dialog (covers 1.13)

**Files:**
- Rewrite: `components/ui/file-share-modal.tsx`
- Test: `Tests/workspace/FileShareModal.test.tsx`

**Interfaces:**
- Consumes: `sendInvitation`, `InviteRole` (existing, `lib/data/invitations.ts`); `createShareLink`, `listShares`, `revokeShare` (existing); the file's `team_id` from the `FILE` prop; new optional prop `teamName?: string`.
- Produces: the same default export and props as today, plus `teamName`.

- [ ] **Step 1: Run impact** on `FileShareModal` (callers: the editor header, the dashboard file list if any); report.
- [ ] **Step 2: Write the failing tests** (mock the data functions and the clipboard). Invite: a bad email shows an inline error and does not call `sendInvitation`; a good email with the default role calls `sendInvitation(db, 't1', 'a@b.co', 'viewer')`, copies `<origin>/invite/<token>`, and shows the sentence naming the team and saying the person will see every file in it; choosing Member sends `'member'`. Links: the active links list shows permission and expiry; Copy writes `<origin>/shared/<token>`; Revoke calls `revokeShare`; creating a link calls `createShareLink` with the chosen permission and expiry (`null` when off). Failures show a toast and keep the dialog open.
- [ ] **Step 3:** Run the file. Expected: FAIL.
- [ ] **Step 4: Implement** the layout of the prototype dialog (header "Share this file", close button, an "Invite to <team>" row with email, role select and Invite button, then the "Anyone with the link" section) using the existing Radix `Dialog` and `Select`, Graphite classes, a visible label on every field, and 16px text inputs. Keep the multi-link list and expiry control (see decisions).
- [ ] **Step 5:** Run the file and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: Graphite share dialog with team invite (stage 1.13)`.

---

### Task 11: Shared-link images and read-only theme (covers 1.10 for links, 1.14)

**Files:**
- Modify: `lib/data/canvasFiles.ts`, `app/(routes)/shared/[token]/SharedFileView.tsx`
- Create: `app/api/shared/[token]/files/[key]/route.ts`
- Test: `Tests/data/sharedCanvasFiles.test.ts`, `Tests/shared/filesRoute.test.ts`

**Interfaces:**
- Consumes: `resolveShareToken` (existing, `lib/data/shares.ts`); `FILE_KEY`, `MAX_CANVAS_FILE_BYTES`, `CANVAS_MIME_TYPES`, `CANVAS_BUCKET` (Task 5).
- Produces:
  - `readSharedCanvasFile(db: Db, token: string, key: string): Promise<{ status: 'ok'; blob: Blob } | { status: 'not_found' | 'revoked' | 'expired' }>`.
  - `saveSharedCanvasFile(db: Db, token: string, key: string, blob: Blob): Promise<'ok' | 'forbidden' | 'invalid' | 'too_large' | 'not_found' | 'revoked' | 'expired'>`.
  - `sharedCanvasFileStore(token: string): CanvasFileStore` (uses `fetch` against the route).
  - Route `GET` and `PUT` at `/api/shared/[token]/files/[key]`.

- [ ] **Step 1: Write the failing tests** (a `from()` stand-in for the share lookup plus a `storage` stand-in). Data: `readSharedCanvasFile` reads `<share.file.id>/<key>` and never a path built from the request; returns `not_found` for a bad token, `revoked`, `expired`; a key of `../x`, `a/b` or 65 characters returns `not_found`. `saveSharedCanvasFile`: a `view` or `comment` link returns `forbidden` and uploads nothing; an `edit` link uploads to `<share.file.id>/<key>`; a blob over 5 MiB returns `too_large`; a type outside the allow-list returns `invalid`; an already-existing object counts as `ok`. Route (mock `@/lib/supabase/admin`): GET answers with the blob, `Content-Type` of the stored type, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cache-Control: private, no-store`; status codes 404 / 410 / 403 / 413 / 400 follow the result as in `app/api/shared/[token]/route.ts`; PUT refuses bodies over 5 MiB without reading them all when `Content-Length` says so.
- [ ] **Step 2:** Run both files. Expected: FAIL.
- [ ] **Step 3: Implement** the three exports and the route. The route builds nothing from the request except the token and the validated key; the admin client is created inside the handler. Wire `SharedFileView`: `fileStore={useMemo(() => sharedCanvasFileStore(token), [token])}` and the `sceneRef`/`onStatus` props from Task 9. View-only link holders can load images but their `save` is never called (read-only canvas).
- [ ] **Step 4:** Run both files, `npx tsc --noEmit`, then `rls-security-reviewer` on the route and `lib/data/canvasFiles.ts` (service-role use, path building, response headers). Fix anything it reports.
- [ ] **Step 5: Commit** `feat: shared-link canvas images (stage 1.10, 1.14)`.

---

### Task 12: Graphite look (covers 1.4, 1.5, 1.18)

**Files:**
- Create: `app/(routes)/workspace/workspace.css`, `app/(routes)/workspace/_components/WorkspaceStates.tsx`
- Modify: `app/globals.css` (remove the now-unused `.dark .ce-*` and `.dark .excalidraw` overrides only after the new rules cover them), `WorkspaceLayout.tsx`, the workspace page
- Test: `Tests/workspace/WorkspaceStates.test.tsx`

**Interfaces:**
- Produces: `WorkspaceSkeleton()` and `WorkspaceError({ message: string })` with the same visible texts and test ids as today (`Loading your workspace...`, `Please wait while we fetch your file data`, `loading-spinner`, `Failed to Load File`, `Try Again`, `Go Back`). `DocEyebrow({ updatedAt: string })` ("Document · edited 3 minutes ago") shown above the document.

- [ ] **Step 1: Write the failing tests.** `WorkspaceSkeleton` renders the loading texts, the spinner test id and several skeleton blocks; `WorkspaceError` shows the message and the two buttons, `Try Again` reloads, `Go Back` calls `history.back()`; both use `g-*` classes (no `bg-white` or `dark:bg-gray-*`). `DocEyebrow` renders "edited" plus a relative time from the date.
- [ ] **Step 2:** Run the file. Expected: FAIL.
- [ ] **Step 3: Implement** `WorkspaceStates` from the code now inline in the page and use it there. In `workspace.css`, scoped to `.ws-doc` and `.ws-canvas`: document pane as in the prototype (`max-width 680px`, padding 40/48 desktop, 32/28 ≤ 1023px, 24/20 ≤ 767px, 16px/1.7 text, headings h1 30px / h2 20px / h3 17px / h4 15px, checklist, inline `code` and `mark`, links); the document pane no longer uses `ml-20`. Excalidraw: override `--color-surface-lowest|low|mid|high`, `--color-on-surface`, `--color-primary*`, `--color-border-outline`, `--color-selection` on `.ws-canvas .excalidraw` and `.ws-canvas .excalidraw.theme--dark` using `var(--g-*)`; set the scene `viewBackgroundColor` so the rendered canvas matches `--g-bg` in both themes (Excalidraw's dark theme inverts canvas colours, so measure the rendered pixel in the browser and keep the two values as named constants in `WSCanvas.tsx`). Respect `prefers-reduced-motion` for any transition added.
- [ ] **Step 4:** Run the file, `npx tsc --noEmit`, `npm test`, `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Graphite document pane, canvas theme and loading states (stage 1.4, 1.5, 1.18)`.

---

### Task 13: Browser check and hand-off (covers Verify, 1.19)

**Files:** `Plan/redesign-eraser-canvas-tasks.md`, `Plan/later-backlog.md`

- [ ] **Step 1: Load the `web-ui-test` skill.** Run the app (`run` skill) and, in a browser, check the editor and a shared view at 320, 375, 767, 768, 1023, 1024 and 1280 px in light and dark: no sideways scroll; tap targets ≥ 44px at ≤ 767; Both tab absent at ≤ 767; Document and Canvas switching keeps typed text and drawn shapes; a 200-character file name does not break the header; opening a file without editing shows `Saved`; typing shows `Unsaved changes`, Save shows `Saving…` then `Saved`; two Save presses in a row save twice.
- [ ] **Step 2: Images.** Paste an image, press Save, reload: the image is there. Open the same file through an edit link and a view link: the image shows; the view link cannot upload (a direct `PUT` returns 403). A signed-in viewer cannot upload (covered by `rls.sql`, repeat one manual attempt). Export PNG and SVG from the header: the image is included.
- [ ] **Step 3: Full checks.** `npx tsc --noEmit`, `npm test`, `npm run build`; `mcp__gitnexus__detect_changes` shows only the expected symbols; `rls-security-reviewer` clean.
- [ ] **Step 4: Update the task files.** Tick 1.1–1.18 in `Plan/redesign-eraser-canvas-tasks.md` with one-line notes for the deviations in the decisions table, update `Status` and `Updated`, and add to `Plan/later-backlog.md`: callout and code blocks for Editor.js, live presence avatars, autosave, per-file invites, orphan images after a team delete.
- [ ] **Step 5: [User]** Deploy with the `eraser-deploy` skill after the user agrees, then hand over 1.19: judge the editor on the live site against the Graphite prototype (needs a human eye; includes the no-dot-grid canvas and the icon-only buttons on phones).
