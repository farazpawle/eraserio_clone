---
Title: Stage 3 step plan — Cloud icons (full sets)
Description: Test-first step plan for Stage 3 of the Graphite redesign. Builds the AWS / Azure / Google Cloud / Kubernetes icon sets into static SVGs and a manifest,
  adds an icon registry with search and a fallback, draws `icon:` attributes as real images on the canvas (loaded on demand, never saved to the database),
  and adds code-panel autocomplete, an icon picker and the licence credits. Master list is Plan/redesign-eraser-canvas-tasks.md (tasks 3.1-3.9).
Total Tasks: 9
Status: Tasks 1-8 done in code and tested; Task 9 waits for the real icon packs (3.1) and the browser check
Updated: 2026-10-24
---

# Stage 3 — Cloud icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Web [icon: aws-ec2]` in the code panel draws the real AWS EC2 icon inside the node, with search-as-you-type for icon names, and a bad name falls back to a generic icon with a line error.

**Architecture:** `scripts/build-icons.mjs` turns the downloaded packs into `public/icons/<provider>/<id>.svg` plus `public/icons/manifest.json`. `lib/diagram/icons/registry.ts` loads the manifest once (lazily, browser `fetch`) and answers `getIcon` / `searchIcons`. Before drawing, `resolveIcons` rewrites each `icon` to its canonical id (or `generic`) and reports unknown names as line errors. `toSkeletons` draws an Excalidraw `image` element with `fileId = "icon:<id>"`. Those files are added to the scene on demand from `/icons/...` (one mechanism for open, paste, undo and redraw) and are skipped by `persistCanvas`, so they never reach the database.

**Tech Stack:** Next.js 14.2.35, `@excalidraw/excalidraw` 0.18.1, CodeMirror 6 (all already installed), Jest. No new packages.

**Spec:** `Plan/redesign-eraser-canvas-plan.md` ("Icons storage" decision, Review item 5, Licence note), `Plan/redesign-eraser-canvas-tasks.md` Stage 3 (3.1–3.9), `Plan/stage-2-diagrams-plan.md` (the code this builds on).

## Decisions made while planning

| Topic | Decision | By |
|---|---|---|
| Icon ids | `<provider>-<slug>` with providers `aws`, `azure`, `gcp`, `k8s` (for example `aws-ec2`). File: `public/icons/<provider>/<id>.svg`, URL `/icons/<provider>/<id>.svg`, so the URL needs only the id. Fallback: `generic`, file `public/icons/generic.svg`, hand drawn (not from any pack). | Agent |
| Aliases | The packs name files `Arch_Amazon-Elastic-Load-Balancing_64.svg`; the starter templates and help use short names (`aws-elb`, `aws-vpc`, `aws-s3`). A small alias table in the build library adds `aliases` to manifest entries; `getIcon` matches id or alias and returns the canonical id. | Agent |
| Manifest | `{ "version": 1, "icons": [{ "id", "provider", "label", "keywords": [], "aliases": [] }] }`, compact JSON, fetched from `/icons/manifest.json` only when a diagram is drawn, the panel opens or the canvas holds an icon. The editor's first load of a file with no icons downloads nothing. | Agent |
| Pack input | The script reads **extracted folders** (`icons-src/aws`, `azure`, `gcp`, `k8s`, git-ignored), not zips: zip reading needs a new package (Rule 17) and the user has to click through the Azure terms anyway. Task 3.1 is updated to say so. | Agent |
| SVG cleaning | A small handwritten cleaner (drop XML prolog, comments, `<metadata>`, `<title>`; make sure `width` and `height` exist, taken from the viewBox, because Excalidraw draws images through a canvas that needs an intrinsic size; reject any SVG containing `<script` or `on…=` attributes). No `svgo`: the official files are already small. Upgrade to `svgo` if the icon bytes matter. | Agent |
| Pack layouts | The per-provider file rules (which files count, how a file name becomes a label) come from what the vendors document, not from the files, because they are not downloaded yet. The build prints a count per provider and every skipped or duplicate file; the rules are checked and corrected against the real packs when they arrive. | Agent |
| Image files | `fileId = "icon:<canonical id>"`, `mimeType image/svg+xml`, base64 `dataURL`. Added with `api.addFiles` when an `icon:` id is on the canvas and missing from Excalidraw's files. `persistCanvas` and `loadSceneFiles` ignore `icon:` ids (no upload, no storage lookup). Exports include them because they are in Excalidraw's file list. | Agent |
| Icon size | Nodes: 32×32 image at the top centre (replaces the `[icon]` text tag; the label already sits at the bottom). Groups: 24×24 at the top-right corner (group labels sit top-left). | Agent |
| Manifest or fetch fails | Drawing never waits on or fails because of icons: with no registry the raw name is kept, no icon errors are shown, and the image shows Excalidraw's placeholder until a later redraw succeeds. | Agent |
| Picker target | The picker sets the icon on the code line the cursor is in (a node or group line). On canvas, clicking a diagram shape selects the whole diagram, so a "selected shape" cannot name one node. A line with no node (an edge line, blank) disables the picker with a hint. | Agent |
| Licence text | Kubernetes icons: CC BY 4.0 attribution. AWS, Microsoft and Google icons: owner notices on the privacy page under "Credits". Exact wording is confirmed against each pack's terms in task 3.1. | Agent |

## Global Constraints

- Parse, layout and render files stay pure TypeScript (no React, DOM or Excalidraw runtime). `lib/diagram/icons/files.ts` uses `fetch`/`btoa` through injected parameters and is the only icons file that touches the browser.
- `block.ts` stays the only diagram file importing `@excalidraw/excalidraw`.
- Icon files are never uploaded to Supabase or written to `files.whiteboard`'s file store.
- Drawing must not be blocked by a slow or failed icon request.
- Manifest under 300 KB gzipped; the editor's first load downloads no icon file.
- Tests in `Tests/diagram/` (pure, `@jest-environment node` where no DOM is needed), `Tests/canvas/`, `Tests/workspace/`. Checks per task: `npx tsc --noEmit` and the task's tests; after tasks 5, 7 and 9: `npm test` and `npm run build`.
- GitNexus: `impact` (upstream) before changing `toSkeletons`, `persistCanvas`, `referencedFileIds`, `diagramCompletions`, `DiagramStyleBar` or `WSCanvas`; `detect_changes` before each commit.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Unknown or misspelled icon.** `A [icon: aws-nope]` still draws the node with the generic icon and gives one error on that line (Task 3).
2. **Icon files never reach the database.** A scene with 3 icon images and 1 pasted image uploads exactly 1 file (Task 5).
3. **Saved canvas reopens with icons.** Elements stored with `icon:` ids and no files get their icons added with no other file loading (Task 5).
4. **Offline or missing manifest.** Drawing still completes, with no icon errors and no thrown exception (Tasks 3 and 5).
5. **Hostile SVG.** An SVG with `<script>` or `onload=` is rejected by the build and never copied to `public/` (Task 2).

## File Structure

| File | Responsibility |
|---|---|
| `lib/diagram/icons/registry.ts` (new) | `IconEntry`, `Manifest`, `createRegistry`, `loadRegistry`, fallback id |
| `lib/diagram/icons/resolve.ts` (new) | `resolveIcons(model, registry)`: canonical ids and unknown-icon errors |
| `lib/diagram/icons/files.ts` (new) | `iconFileId`, `iconIdsOf`, `missingIconIds`, `loadIconFiles` |
| `lib/diagram/icons/codeEdit.ts` (new) | `setIconOnLine(code, line, iconId)` |
| `lib/diagram/icons/build.mjs` (new) | Pure build logic: cleaning, naming, manifest, `buildIcons` |
| `scripts/build-icons.mjs` (new) | CLI wrapper around `buildIcons` |
| `public/icons/generic.svg` (new) | Fallback icon |
| `lib/diagram/render/flow.ts` | Draw image elements for node and group icons |
| `lib/diagram/block.ts` | Load the registry, call `resolveIcons`, merge its errors |
| `lib/canvas/persist.ts` | Ignore `icon:` ids |
| `app/(routes)/workspace/_components/WSCanvas.tsx` | Add missing icon files; hold the registry; cursor-line ref |
| `app/(routes)/workspace/_components/diagram/codeMirrorSetup.ts` | Icon value autocomplete |
| `app/(routes)/workspace/_components/diagram/DiagramCodePanel.tsx` | Pass the registry to completions; publish the cursor line |
| `app/(routes)/workspace/_components/diagram/IconPicker.tsx` (new), `DiagramStyleBar.tsx` | The picker |
| `app/privacy/page.tsx` | Credits |

---

### Task 1: Icon registry (tasks 3.3, 3.4)

**Files:**
- Create: `lib/diagram/icons/registry.ts`
- Test: `Tests/diagram/icons-registry.test.ts`

**Interfaces:**
- Produces:
  - `type IconEntry = { id: string; provider: 'aws' | 'azure' | 'gcp' | 'k8s'; label: string; keywords: string[]; aliases: string[] }`
  - `type Manifest = { version: 1; icons: IconEntry[] }`
  - `type Registry = { icons: readonly IconEntry[]; getIcon(id: string): { id: string; known: boolean }; searchIcons(query: string, limit: number): IconEntry[] }`
  - `FALLBACK_ICON_ID = 'generic'`
  - `createRegistry(manifest: Manifest): Registry`
  - `iconUrl(id: string): string` — `/icons/generic.svg` for the fallback, else `/icons/<provider>/<id>.svg` with the provider read from the id prefix before the first `-`.
  - `loadRegistry(fetcher?: typeof fetch): Promise<Registry>` — one request, memoised; a failed request is not memoised (the next call retries).
  - `resetRegistryCache(): void` (tests only)

- [ ] **Step 1: Write the failing tests** in `Tests/diagram/icons-registry.test.ts` (node environment) with a 6-entry fixture manifest (`aws-ec2` with alias `aws-compute`, `aws-s3` label "Simple Storage Service" keyword `bucket`, `azure-vm`, `gcp-compute-engine`, `k8s-pod`, `aws-ec2-auto-scaling`):
  - `getIcon('aws-ec2')` → `{ id: 'aws-ec2', known: true }`
  - `getIcon('aws-compute')` (alias) → `{ id: 'aws-ec2', known: true }`
  - `getIcon('aws-nope')` → `{ id: 'generic', known: false }`; `getIcon('')` the same
  - `searchIcons('bucket', 20)` → `[aws-s3]` (keyword match)
  - `searchIcons('ec2', 20)` → `aws-ec2` before `aws-ec2-auto-scaling` (exact id/prefix ranks first)
  - `searchIcons('', 3)` → first 3 entries; `searchIcons('zzz', 20)` → `[]`; `limit` is honoured; matching ignores case and `-`/space differences (`'Compute Engine'` finds `gcp-compute-engine`)
  - `iconUrl('aws-ec2')` → `/icons/aws/aws-ec2.svg`; `iconUrl('generic')` → `/icons/generic.svg`
  - `loadRegistry(fakeFetch)` called twice → `fakeFetch` called once; after a rejected fetch, the next call fetches again; a non-OK response rejects.
- [ ] **Step 2: Run to verify it fails.** Run: `npx jest Tests/diagram/icons-registry.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `lib/diagram/icons/registry.ts` to the interface above. Ranking: exact id/alias, then id prefix, then label contains, then keyword contains (normalise by lower-casing and turning `-`/`_`/spaces into one space); ties keep manifest order.
- [ ] **Step 4: Run to verify it passes.** Same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): icon registry with search and fallback`.

### Task 2: Build script and fallback icon (task 3.2)

**Files:**
- Create: `lib/diagram/icons/build.mjs`, `scripts/build-icons.mjs`, `public/icons/generic.svg`
- Modify: `.gitignore` (add `/icons-src/`), `package.json` (script `"build:icons": "node scripts/build-icons.mjs"`)
- Test: `Tests/diagram/icons-build.test.ts` (node environment, temp directories)

**Interfaces:**
- Produces (all exported from `build.mjs`, with JSDoc types):
  - `cleanSvg(text: string): string` — throws `Error('unsafe svg')` on `<script` or `\son\w+=`; removes the XML prolog, comments, `<metadata>…</metadata>`, `<title>…</title>`; guarantees `width` and `height` on the root `<svg>` (from the `viewBox` when missing).
  - `PROVIDERS: Record<'aws'|'azure'|'gcp'|'k8s', { include(relPath: string): boolean; label(fileName: string): string }>` — rules: **aws** keeps `Arch_<Name>_64.svg` (service icons) and `Res_<Name>_48.svg` without `Dark`/`Light` suffix variants; label from `<Name>` with `-`/`_` → spaces, a leading `Amazon `/`AWS ` kept in the label but dropped from the id; **azure** keeps `<digits>-icon-service-<Name>.svg`; **gcp** keeps every `.svg`, label from the file name minus a trailing `_icon`/`-icon`; **k8s** keeps `.svg` under a `unlabeled` folder (the app draws its own label), falling back to all `.svg` if the pack has no `unlabeled` folder.
  - `slug(text: string): string` — lower case, `[a-z0-9]` runs joined by `-`.
  - `ALIASES: Record<string, string[]>` — keyed by canonical id; must at least map the ids the templates and help use (`aws-vpc`, `aws-elb`, `aws-ec2`, `aws-rds`, `aws-s3`, `aws-lambda`) once the real ids are known; before the packs arrive the fixture ids drive the test.
  - `buildIcons(opts: { sources: Partial<Record<Provider, string>>; outDir: string }): Promise<{ manifest: Manifest; skipped: string[]; duplicates: string[] }>` — walks each source folder, applies `include`, cleans, writes `<outDir>/<provider>/<id>.svg` and `<outDir>/manifest.json` (compact JSON, entries sorted by id), keywords = label words; the first file wins on a duplicate id and the rest are listed in `duplicates`; a file `cleanSvg` rejects is listed in `skipped` and **not written**.
- `scripts/build-icons.mjs`: reads `icons-src/<provider>` for each provider that exists, calls `buildIcons`, prints `provider: N icons`, then every skipped and duplicate file. Exit code 1 if any source folder is missing (the manifest lists every provider, so a partial build would drop icons whose files remain).

- [ ] **Step 1: Write the failing tests** (`Tests/diagram/icons-build.test.ts`):
  - `cleanSvg` strips prolog, comment, metadata and title; adds `width="64" height="64"` from `viewBox="0 0 64 64"`; leaves existing width/height alone; throws on `<script>alert(1)</script>` and on `<svg onload="x()">`.
  - `slug('Amazon EC2 Auto Scaling')` → `amazon-ec2-auto-scaling`.
  - With a temp folder tree `aws/Arch_Compute/64/Arch_Amazon-EC2_64.svg`, `aws/Arch_Compute/32/Arch_Amazon-EC2_32.svg`, `k8s/labeled/pod.svg`, `k8s/unlabeled/pod.svg`, `azure/Icons/compute/10021-icon-service-Virtual-Machine.svg`, `gcp/Compute Engine.svg`, and an evil `gcp/bad.svg` containing `<script>`: `buildIcons` writes `aws/aws-ec2.svg`, `k8s/k8s-pod.svg`, `azure/azure-virtual-machine.svg`, `gcp/gcp-compute-engine.svg`; does **not** write `aws-ec2` from the 32 file or `k8s` from `labeled`; lists `bad.svg` in `skipped` and writes no `gcp-bad.svg`; the manifest has exactly 4 entries with correct `provider`, `label` ("Amazon EC2" for aws-ec2), keywords and sorted order; a second identical file for the same id ends in `duplicates` and does not overwrite.
  - Running `buildIcons` twice gives byte-identical output (safe to re-run).
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/icons-build.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `build.mjs` and the CLI; draw `public/icons/generic.svg` (a 64×64 rounded box outline, `currentColor`-free, explicit `#6b7280` stroke so it shows on light and dark canvases).
- [ ] **Step 4: Run to verify it passes.** Same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): build script for the cloud icon packs`.

### Task 3: Resolve icon names before drawing (tasks 3.3 fallback + error)

**Files:**
- Create: `lib/diagram/icons/resolve.ts`
- Modify: `lib/diagram/block.ts` (`draw`)
- Test: `Tests/diagram/icons-resolve.test.ts`, `Tests/diagram/block.test.ts` (one added case)

**Interfaces:**
- Consumes: `Registry` from Task 1; `FlowModel` from `lib/diagram/types.ts`.
- Produces: `resolveIcons(model: FlowModel, registry: Registry | null): { model: FlowModel; errors: DiagramError[] }` — pure. With a registry: every node and group `icon` becomes the canonical id (alias resolved); an unknown name becomes `generic` and adds `{ line: item.line, message: 'Unknown icon "aws-nope". Try typing part of a name to search.' }`. With `null`: model returned unchanged, no errors. Items without `icon` are untouched; the input model is not mutated.

- [ ] **Step 1: Write the failing tests** (`icons-resolve.test.ts`): alias `aws-compute` → `aws-ec2`, no error; unknown on a node at line 3 → icon `generic`, one error `{line: 3, …}`; unknown on a group → same; two unknowns → two errors in line order; `registry = null` → same object content, `errors = []`; input model unchanged (deep-equal to a copy). In `block.test.ts` add: with `global.fetch` mocked to return a manifest containing `aws-ec2`, `createDiagram` of `A [icon: aws-nope]` returns one error on line 1 and image/text children exist; with `global.fetch` rejecting, `createDiagram` still resolves with no icon error (call `resetRegistryCache()` in `beforeEach`).
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/icons-resolve.test.ts Tests/diagram/block.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `resolveIcons`; in `draw()` do `const registry = await loadRegistry().catch(() => null)` after `parseFlow`, apply `resolveIcons`, lay out and render the resolved model, and return `errors: [...parseErrors, ...iconErrors]` sorted by line.
- [ ] **Step 4: Run to verify it passes.** Same command. Expected: PASS (existing block tests unchanged: jsdom has no `fetch`, so the registry is `null` there).
- [ ] **Step 5: Commit** `feat(icons): unknown icon names fall back to generic with a line error`.

### Task 4: Draw icons as images (task 3.5, drawing half)

**Files:**
- Modify: `lib/diagram/render/flow.ts`, `lib/diagram/layout/flow.ts` (group header room, if the 24px icon would cover the label), `Tests/diagram/render.test.ts` (tag tests replaced)
- Create: `lib/diagram/icons/files.ts` (only `iconFileId` and `isIconFileId` in this task)

**Interfaces:**
- Produces: `iconFileId(id: string): string` → `` `icon:${id}` ``; `isIconFileId(id: string): boolean`.
- `toSkeletons` emits, per node with an icon, `{ type: 'image', id: '<diagramId>:i:<nodeId>', fileId: 'icon:<n.icon>', x, y, width: 32, height: 32, status: 'saved', customData: {diagramId}, groupIds: [diagramId] }` centred horizontally at `b.y + 8`; per group with an icon, the same with id `<diagramId>:gi:<groupId>`, 24×24 at the top-right, 8px inside the corner. The old text tag is gone.

- [ ] **Step 1: Write the failing tests** in `render.test.ts` (replacing the `[aws-ec2]` tag tests at lines ~117-130): the icon element is `type: 'image'`, `fileId === 'icon:aws-ec2'`, 32×32, centred in the node's box and inside it vertically; a group icon is 24×24 inside the group's top-right; no `text` skeleton contains `[`; label stays `verticalAlign: 'bottom'` with an icon; the bottom of the icon does not overlap the label's area (`y + 32 <= box.y + 8 + 32 < box.y + height - 20`). Add `estimateNodeSize` expectation unchanged (icon nodes keep +24 height).
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/render.test.ts`. Expected: FAIL on the replaced cases.
- [ ] **Step 3: Implement** the image skeletons in `render/flow.ts` (remove `ICON_FONT_SIZE`) and the two helpers. If the node height is too small for 32 + 8 + a two-line label, raise the icon extra in `estimateNodeSize` from 24 to 40 and update the test that pins `{ width: 120, height: 80 }` (`Tests/diagram/flow-layout.test.ts:25`) to the new value.
- [ ] **Step 4: Run to verify it passes.** `npx jest Tests/diagram`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): draw node and group icons as image elements`.

### Task 5: Put icon files in the scene, keep them out of the database (task 3.5, loading half)

**Files:**
- Modify: `lib/diagram/icons/files.ts`, `lib/canvas/persist.ts`, `app/(routes)/workspace/_components/WSCanvas.tsx`
- Test: `Tests/diagram/icons-files.test.ts`, `Tests/canvas/persist.test.ts` (added cases), `Tests/workspace/WSCanvas.test.tsx` (one added case)

**Interfaces:**
- Consumes: `iconFileId`, `isIconFileId` (Task 4); `Registry`, `iconUrl`, `loadRegistry` (Task 1).
- Produces in `files.ts`:
  - `iconIdsOf(elements: readonly ExcalidrawElement[]): string[]` — canonical ids from non-deleted `image` elements with an `icon:` fileId.
  - `missingIconIds(elements, files: BinaryFiles, requested: ReadonlySet<string>): string[]` — in `iconIdsOf` but in neither `files` nor `requested`.
  - `loadIconFiles(ids: string[], fetcher?: typeof fetch): Promise<BinaryFileData[]>` — per id: GET `iconUrl(id)`, text → base64 `data:image/svg+xml;base64,…`, `{ id: iconFileId(id), mimeType: 'image/svg+xml', dataURL, created: Date.now() }`; an id whose request fails is left out (the others still load).
- `persist.ts`: `referencedFileIds` skips `icon:` ids.

- [ ] **Step 1: Write the failing tests:**
  - `icons-files.test.ts`: `iconIdsOf` ignores deleted elements, non-icon images and non-images; `missingIconIds` drops ids already in `files` or in `requested` and returns `[]` for a scene with no icons; `loadIconFiles(['aws-ec2','aws-gone'], fake)` where the second fetch returns 404 → one file with `id 'icon:aws-ec2'`, `mimeType 'image/svg+xml'`, `dataURL` starting `data:image/svg+xml;base64,` and decoding back to the fetched SVG; `loadIconFiles([])` makes no request.
  - `persist.test.ts`: `referencedFileIds` omits `icon:aws-ec2`; `persistCanvas` of a scene with three `icon:` images and one pasted image calls `store.save` exactly once; `loadSceneFiles` for a scene holding only `icon:` images does not call `store.load`.
  - `WSCanvas.test.tsx`: when Excalidraw's `onChange` reports an element with `fileId: 'icon:aws-ec2'` and no file, `api.addFiles` is called once with that file (the module `loadIconFiles` is mocked), and a second `onChange` with the same missing id does not call it again.
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/icons-files.test.ts Tests/canvas/persist.test.ts Tests/workspace/WSCanvas.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the three functions and the `persist.ts` change. In `WSCanvas.handleChange`, call a small helper that keeps a `requested` ref set, runs `missingIconIds`, and for a non-empty result does `loadIconFiles(ids).then((files) => files.length && api?.addFiles(files))`, removing the ids from `requested` on failure so a later change retries. It runs for viewers too (read-only still needs images).
- [ ] **Step 4: Run to verify it passes.** Same command, then `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): load icon images on demand and keep them out of storage`.

### Task 6: Icon autocomplete in the code panel (task 3.6)

**Files:**
- Modify: `app/(routes)/workspace/_components/diagram/codeMirrorSetup.ts`, `DiagramCodePanel.tsx`, `WSCanvas.tsx`
- Test: `Tests/diagram/codeMirrorSetup.test.ts` (added cases)

**Interfaces:**
- Consumes: `Registry`, `iconUrl` (Task 1).
- Produces: `diagramCompletions(nodeNames: string[], icons?: Registry | null): CompletionSource`. Inside `[...]`, after `icon:` the options are `icons.searchIcons(typedWord, 20)` mapped to `{ label: id, detail: provider, type: 'constant', info: () => <img src=iconUrl(id) width=24 height=24 alt="">, boost }`; `ATTR_KEYS` completion is unchanged. `DiagramCodePanel` gets an optional `icons?: Registry | null` prop passed on to the compartment reconfigure (dependency list gains the registry). `WSCanvas` calls `loadRegistry()` when a diagram panel is active and stores it in state.

- [ ] **Step 1: Write the failing tests** in `codeMirrorSetup.test.ts` using the existing helper style: with a fixture registry, `Web [icon: ec` offers `aws-ec2` first and at most 20 options; with `Web [color: red, icon: ` offers up to 20; with `icons` omitted or `null` there are no icon options and no throw; the `info` function returns an element whose `img.getAttribute('src')` is `/icons/aws/aws-ec2.svg`; `shape:`/`color:` completion is unchanged.
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/codeMirrorSetup.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes.** Same command plus `Tests/workspace/DiagramCodePanel.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): icon name autocomplete in the code panel`.

### Task 7: Icon picker in the style bar (task 3.7)

**Files:**
- Create: `lib/diagram/icons/codeEdit.ts`, `app/(routes)/workspace/_components/diagram/IconPicker.tsx`
- Modify: `DiagramCodePanel.tsx` (publish the cursor line), `DiagramStyleBar.tsx`, `WSCanvas.tsx`
- Test: `Tests/diagram/icons-codeEdit.test.ts`, `Tests/workspace/IconPicker.test.tsx`, `Tests/workspace/DiagramStyleBar.test.tsx` (added case)

**Interfaces:**
- Produces: `setIconOnLine(code: string, line: number, iconId: string): string | null` — `line` is 1-based. On a node or group line (judged by `parseFlow(code)`: some node or group has `.line === line`): replaces an existing `icon: …` value inside the `[...]`, or appends `, icon: <id>` to an existing `[...]`, or adds ` [icon: <id>]` after the name (before a trailing ` {` on a group line). Quotes inside the brackets are respected (a `]` or `,` inside `label: "a, b]"` is not a delimiter). Returns `null` on any other line.
- `IconPicker` props: `{ icons: Registry | null; code: string; cursorLine: MutableRefObject<number>; onCode(code: string): void }`. A button "Icon" opens a popover with a search box (label "Search icons") and a result grid of up to 40 results; each result is a button with the icon image and the label; choosing one calls `onCode(setIconOnLine(...))` and closes. Tap targets 44px at ≤ 767px, text 16px there. When the cursor line is not a node/group line, the choices are disabled and a hint reads "Put the cursor on a node line first." While `icons` is `null` the button is disabled with "Icons are loading".
- `DiagramCodePanel` writes the 1-based cursor line into an optional `cursorLine?: MutableRefObject<number>` prop on every selection change.
- `DiagramStyleBar` gains optional `icons` and `cursorLine` props and renders the picker when both are given; viewers never get the style bar (already true).

- [ ] **Step 1: Write the failing tests:**
  - `icons-codeEdit.test.ts`: `Web` (line 1) + `aws-ec2` → `Web [icon: aws-ec2]`; `Web [color: blue]` → `Web [color: blue, icon: aws-ec2]`; `Web [icon: azure-vm, color: blue]` → value replaced; `VPC {` (group) → `VPC [icon: aws-vpc] {`; `VPC [color: red] {` → `VPC [color: red, icon: aws-vpc] {`; `Web [label: "a, b]"]` → `Web [label: "a, b]", icon: aws-ec2]`; an edge line `A > B` where A and B are declared on other lines → `null`; blank line → `null`; line out of range → `null`; the result re-parses with the node's `icon` equal to the id and no new errors.
  - `IconPicker.test.tsx`: typing "bucket" shows the matching result; clicking it calls `onCode` with the edited code; on a non-node line the results are disabled and the hint shows; `icons = null` disables the button.
  - `DiagramStyleBar.test.tsx`: the picker renders when `icons` and `cursorLine` are passed, not otherwise.
- [ ] **Step 2: Run to verify it fails.** `npx jest Tests/diagram/icons-codeEdit.test.ts Tests/workspace/IconPicker.test.tsx Tests/workspace/DiagramStyleBar.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** (reuse the Radix popover already in `components/ui` if one exists there, otherwise a plain disclosure `div`).
- [ ] **Step 4: Run to verify it passes.** Same command, then `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(icons): icon picker in the diagram style bar`.

### Task 8: Credits (task 3.8)

**Files:**
- Modify: `app/privacy/page.tsx`
- Test: `Tests/auth/...` or the existing privacy test if one exists, otherwise `Tests/brand/credits.test.tsx`

- [ ] **Step 1: Write the failing test:** rendering `PrivacyPage` shows a heading "Credits" and text for the Kubernetes icons with "CC BY 4.0" and a link to the licence (`https://creativecommons.org/licenses/by/4.0/`) and to `https://github.com/kubernetes/community/tree/master/icons`, and trademark notices naming Amazon Web Services, Microsoft Azure and Google Cloud.
- [ ] **Step 2: Run to verify it fails.** Expected: FAIL (no Credits section).
- [ ] **Step 3: Implement** a "Credits" section in the page's existing style, worded from each pack's terms read in task 3.1.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** `docs(icons): licence credits on the privacy page`.

### Task 9: Real icon sets, measurements and browser check (tasks 3.1, 3.9, stage verify)

**Files:**
- Create: `Tests/diagram/icons-manifest.test.ts`
- Modify: `public/icons/**` (build output, committed), `docs/` or `Plan/` notes, the syntax help page (mention icon search), `Plan/redesign-eraser-canvas-tasks.md`

**Needs the user (task 3.1):** download the four packs and extract them into `icons-src/aws`, `icons-src/azure`, `icons-src/gcp`, `icons-src/k8s` (git-ignored), accepting each vendor's terms. Everything before this step is built and tested without them.

- [ ] **Step 1: Write the manifest test** (`icons-manifest.test.ts`, node environment, skips with a visible reason when `public/icons/manifest.json` is missing): every entry's file exists; ids are unique and match `^(aws|azure|gcp|k8s)-[a-z0-9-]+$`; no alias collides with another id; the gzipped manifest is under 300 KB; every id and alias used in `lib/diagram/templates.ts` resolves; every file passes `cleanSvg`.
- [ ] **Step 2: Run `npm run build:icons`.** Check the printed counts per provider, skipped and duplicate lists against the packs; correct the rules in `build.mjs` (and its tests) where the real layouts differ; fill `ALIASES` with the real ids for `aws-vpc`, `aws-elb`, `aws-ec2`, `aws-rds`, `aws-s3`, `aws-lambda`.
- [ ] **Step 3: Run the manifest test.** Expected: PASS (not skipped).
- [ ] **Step 4: Browser check** on the dev server with a throwaway file the user approves: the cloud starter draws real icons; a typed unknown icon shows the generic icon and a line error; autocomplete and picker find `s3` and `bucket`; reload keeps the icons; undo/redo and copy/paste keep them; PNG and SVG export include them; a share link in view mode shows them; the network panel shows no `/icons/` request when a file has no icons, and for a 50-icon diagram records the manifest size and the icon requests (they load in parallel and drawing does not wait).
- [ ] **Step 5: Commit** `feat(icons): full AWS, Azure, Google Cloud and Kubernetes sets`.

## Self-review

- **Coverage:** 3.1 → Task 9 (user); 3.2 → 2; 3.3/3.4 → 1 and 3; 3.5 → 4 and 5; 3.6 → 6; 3.7 → 7; 3.8 → 8; 3.9 → 9. Verify clauses: every manifest id resolves (Task 9 test), missing icons fall back (Tasks 1 and 3), first load downloads no icons (Tasks 5 and 9).
- **Names:** `getIcon`, `searchIcons`, `iconUrl`, `iconFileId`, `isIconFileId`, `iconIdsOf`, `missingIconIds`, `loadIconFiles`, `resolveIcons`, `setIconOnLine`, `loadRegistry`, `resetRegistryCache` are used with the same signatures everywhere above.
- **Not covered here (by design):** icons on ER tables and BPMN nodes come with those stages; resource-icon colour variants and the AWS `Dark`/`Light` pairs are skipped.
