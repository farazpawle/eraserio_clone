---
Title: Stage 2 step plan — Typed diagrams core (flowchart + cloud architecture)
Description: Test-first step plan for Stage 2 of the Graphite redesign. Adds typed diagrams to the Excalidraw canvas: a settings and flowchart parser,
  ELK layout in a web worker, colour/style/font mapping with a contrast test, element generation, the diagram frame block (create, update, copy),
  a CodeMirror code panel (bottom sheet on phones), a style bar, a Diagram button, the drag notice, a syntax help page, viewer rules and browser smoke tests.
  New packages elkjs 0.12.0 and CodeMirror 6. Master list is Plan/redesign-eraser-canvas-tasks.md (tasks 2.1-2.25).
Total Tasks: 12
Status: Complete in code; one hand check (drag a diagram shape) and deploy left
Updated: 2026-10-24
---

# Stage 2 — Typed diagrams core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Typing Eraser-style text in a code panel draws a laid-out flowchart or cloud diagram on the Excalidraw canvas, which saves, reloads, copies, undoes and exports like any other shapes.

**Architecture:** A diagram is an Excalidraw frame whose `customData` is `{ kind: "diagram", version: 1, diagramId, diagramType, code, settings }`, with `diagramId` equal to the frame's id. Code goes `parseSettings` → `parseFlow` → `layoutFlow` (ELK, worker in the browser) → `toSkeletons` → `convertToExcalidrawElements`; `updateDiagram` swaps the frame's children for the new ones in one undoable scene update. Parse, layout and render are pure TypeScript in `lib/diagram/`; only `lib/diagram/block.ts` imports Excalidraw. The canvas side lives in `app/(routes)/workspace/_components/diagram/`.

**Tech Stack:** Next.js 14.2.35, React 18, `@excalidraw/excalidraw` 0.18.1, new `elkjs` 0.12.0, new CodeMirror 6 (`@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15, `@codemirror/language` 6.13.1, `@codemirror/autocomplete` 6.20.4, `@codemirror/lint` 6.9.7, `@codemirror/commands` 6.11.1), Jest + Testing Library.

**Spec:** `Plan/redesign-eraser-canvas-plan.md` (architecture, diagram text language, decisions), `Plan/redesign-eraser-canvas-tasks.md` Stage 2 (2.1–2.25), approved look `designs/redesign/editor.html` (the "Diagram code" panel, footer status line, bottom sheet on phones).

## Decisions made while planning

| Topic | Decision | By |
|---|---|---|
| Diagram id | `diagramId` = the frame's element id. A pasted frame gets a new id from Excalidraw, so a frame whose id ≠ its `customData.diagramId` is a copy and `claimCopies` re-tags it and its children. | Agent |
| Which elements belong to a diagram | Those with `frameId` = the frame's id. A child copied without its frame becomes a plain shape. | Agent |
| Redraw | Fresh element ids each redraw; old children are marked `isDeleted` with a bumped `version` (stays sync-friendly for live editing later). One `updateScene` with `CaptureUpdateAction.IMMEDIATELY`, so one undo step per redraw. | Agent |
| Undo and the panel | Undo restores the frame's `customData.code`; the panel re-reads code from the frame whenever it differs from what the panel last sent. | Agent |
| Stale layouts | ELK is async. Each redraw takes a ticket; a result whose ticket is older than the latest is dropped. | Agent |
| Edge routing | Arrows follow ELK's orthogonal routes: plain arrows (not elbowed) whose points are ELK's edge sections, bound at both ends. Changed after the browser check (Excalidraw elbow routing drew diagonals and loops). A shape dragged by hand keeps its arrow's middle points until the next redraw. | Agent |
| Shapes Excalidraw lacks | rectangle, diamond, ellipse/oval are native. cylinder, document, hexagon, parallelogram, star, trapezoid, triangle are a closed `line` outline behind a transparent rectangle that holds the label and the arrow bindings (Excalidraw only binds labels to rectangle, diamond, ellipse, arrow). | Agent |
| Grouping | All of a diagram's shapes share one `groupIds` entry, so a click selects the whole diagram and a drag moves it. Double-click enters the group to move one shape (this triggers the notice in 2.19). | Agent |
| Defaults | `direction right`, `colorMode pastel`, `styleMode plain`, `typeface clean`, no title (frame name "Diagram"). | Agent |
| Typefaces | rough = Excalifont, clean = Nunito, mono = Comic Shanns (Excalidraw 0.18's code font; Cascadia is legacy). Use the `FONT_FAMILY` values. | Agent |
| Colours | Names: blue, green, red, orange, purple, yellow, teal, pink, gray (default gray). One hex table per colorMode in `style.ts`. | Agent |
| Edge syntax details | `-->`, `<>`, `>`, `<` are found anywhere; `-` only with spaces around it, so names like `api-gateway` work. `A < B` is stored as an arrow from B to A. A `: label` applies to every edge on that line. Both sides may be comma lists. | Agent |
| Names | Names may contain spaces and are case-sensitive. A node created by an edge goes into the group the edge line sits in. Declaring a name again merges its attributes; declaring it inside a second group is an error. | Agent |
| Groups | `Name [attrs] {` must end its line; `}` on its own line. Inline `Group { A, B }` is not supported (clear error). | Agent |
| Cloud architecture in Stage 2 | Same parser and layout as flowchart, its own starter template. `icon:` is parsed and kept; it draws as a small text tag until Stage 3 adds the icon files. | Agent |
| Mobile font size | Code panel text is 16px at ≤ 767px (stops iOS zoom). | Agent |
| Syntax help (2.20) | A public web page `/help/diagram-syntax` instead of `Docs/diagram-syntax.md`: users cannot open files in `Docs/`. One source only. | Agent |
| Viewers (2.21) | Excalidraw view mode has no selection, so viewers get a "Diagram code" button (shown when the canvas has diagrams) that opens the panel read-only, with a diagram picker when there is more than one. | Agent |
| Tests that use Excalidraw | `convertToExcalidrawElements` throws in Jest without `FontFace`, `document.fonts` and a canvas `measureText`. A small stub file `Tests/diagram/excalidrawEnv.ts` provides them (proved by a probe while planning). | Agent |
| elkjs licence | EPL-2.0, used unmodified; no notice needed in the app. | Agent |

## Global Constraints

- Canvas is Excalidraw only. Parse, layout and render files import no React, DOM or Excalidraw runtime code (types only); `lib/diagram/block.ts` is the one file allowed to import `@excalidraw/excalidraw`.
- Excalidraw and CodeMirror load only on the editor and shared pages, through the existing `next/dynamic(..., { ssr: false })` canvas import.
- Every new package must be maintained and free of known critical CVEs; record installed versions at the top of `Plan/redesign-eraser-canvas-tasks.md`.
- Unknown or bad lines give one `DiagramError { line, message }` each (line numbers start at 1) and never stop the rest from drawing.
- Text contrast 4.5:1 in both canvas themes; tap targets ≥ 44px at ≤ 767px; no sideways scroll at 320px; `prefers-reduced-motion` respected. Graphite colours via the `g-*` Tailwind names.
- Tests live in `Tests/diagram/` (pure code, `@jest-environment node` where no DOM is needed) and `Tests/workspace/` (components). Checks per task: `npx tsc --noEmit` and the task's tests; after Tasks 6, 8 and 12: `npm test` and `npm run build`.
- Once per session run `gitnexus list` for the repo name and pass `repo` on every GitNexus call. Run `mcp__gitnexus__impact` (upstream) before changing `WSCanvas` or `SharedFileView` behaviour; run `mcp__gitnexus__detect_changes` before every commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or the model that did the task).

## Review Focus

1. **Half-typed code while typing.** `A >`, `Group [color: ` and an unclosed `{` each produce one error on their own line, and everything else still draws (Task 2 tests).
2. **Typing faster than layout.** Five quick edits must end with the drawing of the last one, never an older one landing late (Task 8 test with a slow fake layout).
3. **Copy and paste a diagram.** The copy keeps its code, gets its own `diagramId`, and editing it leaves the original alone (Task 6 and Task 8 tests).
4. **Undo after a redraw.** Undo brings back the old shapes and the panel shows the old code (Task 8 test on the resync rule, Task 12 browser check).
5. **Hostile or huge text.** A 2,000-character label or a name with `<script>` draws as plain text (no HTML anywhere), and 150 nodes lay out in under 1.5 s (Task 3 and Task 5 tests).

## File Structure

| File | Responsibility |
|---|---|
| `lib/diagram/types.ts` | Shared types: `DiagramType`, `DiagramSettings`, `DiagramError`, `ParseResult`, `FlowModel`, `PositionedFlow`, `DiagramData` |
| `lib/diagram/parse/settings.ts` | `parseSettings`, `setSetting` |
| `lib/diagram/parse/flow.ts` | `parseFlow` |
| `lib/diagram/layout/flow.ts` | `layoutFlow`, `estimateNodeSize` |
| `lib/diagram/layout/elkWorker.ts` | `getElk()` — worker in the browser, bundled ELK in Jest |
| `lib/diagram/render/style.ts` | `styleFor`, colour tables, `FONT` ids |
| `lib/diagram/render/shapes.ts` | `outlinePoints` for the non-native shapes |
| `lib/diagram/render/flow.ts` | `toSkeletons` |
| `lib/diagram/block.ts` | `createDiagram`, `updateDiagram`, `readDiagram`, `claimCopies`, `isDiagramFrame` |
| `lib/diagram/templates.ts` | Starter code for flowchart and cloud |
| `app/(routes)/workspace/_components/diagram/DiagramCodePanel.tsx` | CodeMirror panel, footer status, read-only mode, bottom sheet CSS |
| `app/(routes)/workspace/_components/diagram/codeMirrorSetup.ts` | Highlighting, `toDiagnostics`, `diagramCompletions` |
| `app/(routes)/workspace/_components/diagram/DiagramStyleBar.tsx` | Type, direction, colour, style, font controls |
| `app/(routes)/workspace/_components/diagram/useDiagramEditor.ts` | Binds Excalidraw: active diagram, redraw queue, resync, copies, drag notice |
| `app/(routes)/workspace/_components/WSCanvas.tsx` | Modify: pass `excalidrawAPI`, render button, panel, style bar |
| `app/(routes)/help/diagram-syntax/page.tsx` | Public syntax help page |
| `Tests/diagram/*.test.ts`, `Tests/diagram/excalidrawEnv.ts`, `Tests/diagram/fixtures/bigFlow.ts` | Tests, Excalidraw stubs, 150-node generator |

---

### Task 1: Types and settings lines (2.1–2.3, pure part of 2.18)

**Files:**
- Create: `lib/diagram/types.ts`, `lib/diagram/parse/settings.ts`
- Test: `Tests/diagram/settings.test.ts`

**Interfaces:**
- Produces:
  - `type DiagramType = "flowchart" | "cloud"`
  - `type Direction = "right" | "down" | "left" | "up"`; `ColorMode = "pastel" | "bold" | "outline"`; `StyleMode = "plain" | "shadow" | "watercolor"`; `Typeface = "rough" | "clean" | "mono"`
  - `type DiagramSettings = { direction: Direction; colorMode: ColorMode; styleMode: StyleMode; typeface: Typeface; title?: string }`
  - `const DEFAULT_SETTINGS: DiagramSettings` (right, pastel, plain, clean)
  - `type DiagramError = { line: number; message: string }`; `type ParseResult<M> = { model: M; errors: DiagramError[] }`
  - `parseSettings(lines: string[]): { settings: DiagramSettings; rest: string[]; errors: DiagramError[] }` — `rest` has the same length as `lines`, with settings lines replaced by `""` so later line numbers stay right.
  - `setSetting(code: string, key: keyof DiagramSettings, value: string): string`

- [x] **Step 1: Write the failing tests**
  - every value of every key is read (`direction down` → `settings.direction === "down"`, etc.); `title My checkout flow` keeps the spaces;
  - missing keys fall back to `DEFAULT_SETTINGS`;
  - `colorMode neon` on line 3 → `errors` equals `[{ line: 3, message: 'Unknown colorMode "neon". Use pastel, bold or outline.' }]` and colorMode stays default;
  - a line `direction` with no value is an error; a node line `Direction Service [shape: oval]` is **not** a setting (it has `[`), nor is `direction > api`;
  - `rest` keeps length, blanks only the settings lines;
  - `setSetting("A > B", "direction", "down")` → `"direction down\nA > B"`; on code that already has `direction right` on line 2 it replaces that line in place; the last occurrence wins when the key appears twice.
- [x] **Step 2: Run `npx jest Tests/diagram/settings.test.ts` — expect FAIL (module not found).**
- [x] **Step 3: Implement `types.ts` and `settings.ts`.** A settings line matches `^\s*(title|direction|colorMode|styleMode|typeface)\s+(.+)$` and contains none of `[ { > < :`, except `title`, which takes the rest of the line as-is.
- [x] **Step 4: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): diagram types and settings lines (stage 2.1-2.3)`.

### Task 2: Flowchart parser (2.4, 2.5)

**Files:**
- Create: `lib/diagram/parse/flow.ts`
- Modify: `lib/diagram/types.ts` (add flow model types)
- Test: `Tests/diagram/flow-parse.test.ts`

**Interfaces:**
- Consumes: `parseSettings`, `DiagramError`, `ParseResult`.
- Produces:
  - `type Shape = "rectangle" | "cylinder" | "diamond" | "document" | "ellipse" | "hexagon" | "oval" | "parallelogram" | "star" | "trapezoid" | "triangle"`
  - `type ColorName = "blue" | "green" | "red" | "orange" | "purple" | "yellow" | "teal" | "pink" | "gray"`
  - `type FlowNode = { id: string; label: string; shape: Shape; color?: ColorName; icon?: string; parent?: string; line: number }`
  - `type FlowGroup = { id: string; label: string; color?: ColorName; icon?: string; parent?: string; line: number }`
  - `type EdgeKind = "arrow" | "both" | "line" | "dashed"`; `type FlowEdge = { from: string; to: string; kind: EdgeKind; label?: string; line: number }`
  - `type FlowModel = { settings: DiagramSettings; nodes: FlowNode[]; groups: FlowGroup[]; edges: FlowEdge[] }`
  - `parseFlow(code: string): ParseResult<FlowModel>` (calls `parseSettings` itself)

- [x] **Step 1: Write the failing tests** (one `it` per bullet):
  - `Web Server [shape: cylinder, color: blue, label: "Main, primary"]` → one node, id `Web Server`, label `Main, primary` (comma inside quotes kept), shape cylinder, color blue; with no `label`, label = id; default shape rectangle;
  - nested groups: `VPC {` / `Subnet [color: green] {` / `API` / `}` / `}` → group `Subnet` has `parent: "VPC"`, node `API` has `parent: "Subnet"`;
  - all 5 edge kinds: `A > B` arrow A→B; `A < B` arrow **B→A**; `A <> B` both; `A - B` line; `A --> B` dashed;
  - `api-gateway > db` makes nodes `api-gateway` and `db` (hyphen kept in the name);
  - labels, chains and fan-out: `A > B > C: sends` → edges A→B and B→C, both labelled `sends`; `A > B, C` → A→B and A→C; `A, B > C` → A→C and B→C;
  - nodes created by edges, inside the group the edge line sits in;
  - a redeclared node merges attributes; the same name declared in a second group → error on that line, node stays in the first;
  - a missing `}` → one error on the line that opened the group (`Group "VPC" is never closed`), its children still parsed;
  - an extra `}` → error on that line;
  - unknown attribute `size: 3` → error on that line, node still created; unknown shape or color value → error, default used;
  - one error per bad line with the rest still parsed: code with `A >` on line 2, `Group [color: ` on line 3 and good lines around them → errors exactly on lines 2 and 3, the good nodes and edges all present;
  - `// comment` lines and blank lines are ignored; settings lines are consumed and not read as nodes;
  - inline `G { A, B }` → error `Put the contents of "G" on new lines after "{".`
- [x] **Step 2: Run `npx jest Tests/diagram/flow-parse.test.ts` — expect FAIL.**
- [x] **Step 3: Implement `parseFlow`.** Line by line with a group stack. Per line: strip `//` comments outside quotes; `}` pops; a line ending in `{` opens a group; a line with an edge operator (see the decisions table for operator rules) is an edge line, split on operators, each side split on commas, an optional final `: label`; otherwise a node line `Name [attrs]`. Attribute keys: `icon`, `color`, `shape`, `label`.
- [x] **Step 4: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): flowchart parser with per-line errors (stage 2.4, 2.5)`.

### Task 3: ELK layout and worker (2.6–2.8)

**Files:**
- Create: `lib/diagram/layout/flow.ts`, `lib/diagram/layout/elkWorker.ts`, `Tests/diagram/fixtures/bigFlow.ts`
- Modify: `package.json` (add `elkjs@0.12.0`), `lib/diagram/types.ts`
- Test: `Tests/diagram/flow-layout.test.ts` (`@jest-environment node`)

**Interfaces:**
- Consumes: `FlowModel`, `DiagramSettings`.
- Produces:
  - `type Box = { x: number; y: number; width: number; height: number }`
  - `type PositionedFlow = { nodes: (FlowNode & Box)[]; groups: (FlowGroup & Box)[]; edges: FlowEdge[]; width: number; height: number }` — absolute coordinates, top-left of the whole diagram at 0,0.
  - `estimateNodeSize(node: FlowNode): { width: number; height: number }` — width `clamp(label.length * 8 + 32, 120, 240)`; height `max(56, lines * 20 + 24)` where `lines = ceil(label.length * 8 / 208)`; +24 height when `icon` is set.
  - `type ElkLike = { layout(graph: ElkNode): Promise<ElkNode> }` (`ElkNode` from `elkjs/lib/elk-api`)
  - `getElk(): ElkLike` in `elkWorker.ts` — one shared instance. When `typeof Worker !== "undefined"`: `new ELK({ workerFactory: () => new Worker(new URL("elkjs/lib/elk-worker.min.js", import.meta.url)) })`; otherwise the bundled `elkjs/lib/elk.bundled.js`.
  - `layoutFlow(model: FlowModel, settings: DiagramSettings, elk: ElkLike = getElk()): Promise<PositionedFlow>`
  - `bigFlow(n: number): string` — code for n nodes in 10 groups with about 1.5 edges per node.

- [x] **Step 1: Install** `npm install elkjs@0.12.0`; check `npm audit` shows nothing for elkjs.
- [x] **Step 2: Write the failing tests:**
  - every node gets finite x, y, width, height; no two nodes in the same group overlap;
  - each group's box contains every child's box (absolute coordinates);
  - `direction right` puts B to the right of A for `A > B` (`B.x > A.x + A.width`); `down` puts it below; `left` and `up` the reverse;
  - an empty model gives `{ nodes: [], groups: [], edges: [], width: 0, height: 0 }` without calling ELK;
  - an edge to a group lays out without throwing;
  - `bigFlow(150)` parsed and laid out in under 1500 ms (`performance.now()` around `layoutFlow`).
- [x] **Step 3: Run `npx jest Tests/diagram/flow-layout.test.ts` — expect FAIL.**
- [x] **Step 4: Implement `layoutFlow`.** Root options: `elk.algorithm: layered`, `elk.direction: RIGHT|DOWN|LEFT|UP`, `elk.hierarchyHandling: INCLUDE_CHILDREN`, `elk.edgeRouting: ORTHOGONAL`, `elk.spacing.nodeNode: 40`, `elk.layered.spacing.nodeNodeBetweenLayers: 60`; group nodes `elk.padding: [top=40,left=20,bottom=20,right=20]`. All edges sit on the root; edge labels get `width = label.length * 7 + 8`, `height = 20`. ELK returns child positions relative to the parent, so add parent offsets walking down.
- [x] **Step 5: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 6: Commit** `feat(diagram): ELK layout with worker in the browser (stage 2.6-2.8)`.

### Task 4: Colour, style and font mapping, with contrast (2.9, 2.10, 2.22)

**Files:**
- Create: `lib/diagram/render/style.ts`
- Test: `Tests/diagram/style.test.ts` (`@jest-environment node`)

**Interfaces:**
- Consumes: `DiagramSettings`, `ColorName`.
- Produces:
  - `const FONT = { rough: 5, clean: 6, mono: 8 } as const` (Excalifont, Nunito, Comic Shanns — the `FONT_FAMILY` values in 0.18.1; a test asserts they match the package)
  - `type ElementStyle = { strokeColor: string; backgroundColor: string; textColor: string; fillStyle: "solid" | "hachure"; roughness: 0 | 1 | 2; strokeWidth: 1 | 2; fontFamily: number; shadow: boolean }`
  - `styleFor(item: { color?: ColorName }, settings: DiagramSettings, kind: "node" | "group" = "node"): ElementStyle`
  - `contrastRatio(a: string, b: string): number`, `darkCanvasColor(hex: string): string` (exported for the test)

- [x] **Step 1: Write the failing tests:**
  - pastel: light fill, darker stroke of the same hue, `fillStyle: "solid"`; bold: saturated fill; outline: `backgroundColor: "transparent"`, coloured stroke, `strokeWidth: 2`;
  - plain → roughness 0, `shadow: false`; shadow → roughness 0, `shadow: true`; watercolor → `fillStyle: "hachure"`, roughness 2;
  - rough / clean / mono → `FONT` values, and `FONT` equals the package's `FONT_FAMILY.Excalifont`, `.Nunito`, `["Comic Shanns"]`;
  - groups get a lighter fill than nodes and `strokeWidth: 1`;
  - **contrast:** for every colorMode × every ColorName, `contrastRatio(textColor, background) >= 4.5` where background is the fill (outline: the canvas background `#ffffff`), and the same holds after `darkCanvasColor` is applied to both colours (dark canvas; outline background `#121212`).
- [x] **Step 2: Run `npx jest Tests/diagram/style.test.ts` — expect FAIL.**
- [x] **Step 3: Implement.** `darkCanvasColor` reproduces Excalidraw's dark-mode CSS filter `invert(93%) hue-rotate(180deg)` with the CSS filter matrices from the Filter Effects spec. `contrastRatio` uses WCAG relative luminance. Pick the hex tables so the contrast test passes (bold fills need `textColor` `#ffffff` or `#1e1e1e` per colour, whichever passes both themes).
- [x] **Step 4: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): colour, style and font mapping with contrast test (stage 2.9, 2.10, 2.22)`.

### Task 5: Element generation (2.11, 2.12)

**Files:**
- Create: `lib/diagram/render/shapes.ts`, `lib/diagram/render/flow.ts`
- Test: `Tests/diagram/render.test.ts` (`@jest-environment node`; type-only imports from Excalidraw)

**Interfaces:**
- Consumes: `PositionedFlow`, `styleFor`, `DiagramSettings`.
- Produces:
  - `outlinePoints(shape: Shape, width: number, height: number): [number, number][]` — closed (first point = last), within `0..width`, `0..height`; cylinder approximated with 8 points per curve.
  - `toSkeletons(positioned: PositionedFlow, settings: DiagramSettings, origin: { x: number; y: number }, diagramId: string): ExcalidrawElementSkeleton[]` — order: group outlines (outermost first), shadows, nodes, edges. Skeleton ids are `${diagramId}:n:${id}`, `${diagramId}:g:${id}`, `${diagramId}:e:${index}`.

- [x] **Step 1: Write the failing tests:**
  - every shape kind: rectangle/diamond/ellipse map to that type (oval → ellipse); each other shape gives a `line` with `outlinePoints` plus a transparent rectangle with the label at the same box;
  - labels are bound: each node skeleton has `label.text` = node label;
  - edges: `type: "arrow"`, `elbowed: true`, `start.id` / `end.id` = the node skeleton ids; `both` has both arrowheads, `line` none, `dashed` has `strokeStyle: "dashed"`; edge labels appear as `label.text`;
  - group outlines: a rectangle at the group's box, label top-left (`verticalAlign: "top"`, `textAlign: "left"`), drawn before nodes;
  - shadow mode adds one backing shape per node offset by (6, 6), not bound to anything;
  - every skeleton has `customData.diagramId` and the same `groupIds: [diagramId]`; positions are shifted by `origin`;
  - a 2,000-character label and a label `<script>alert(1)</script>` come out as plain `label.text`, unchanged.
- [x] **Step 2: Run `npx jest Tests/diagram/render.test.ts` — expect FAIL.**
- [x] **Step 3: Implement `shapes.ts` and `toSkeletons`.** Colours, fill, roughness and font from `styleFor`; `icon` shows as a small text element `[icon-name]` above the label until Stage 3.
- [x] **Step 4: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): Excalidraw element generation for flow diagrams (stage 2.11, 2.12)`.

### Task 6: The diagram block (2.13, 2.14)

**Files:**
- Create: `lib/diagram/block.ts`, `lib/diagram/templates.ts`, `Tests/diagram/excalidrawEnv.ts`
- Modify: `lib/diagram/types.ts`
- Test: `Tests/diagram/block.test.ts`

**Interfaces:**
- Consumes: `parseFlow`, `layoutFlow`, `toSkeletons`, `ElkLike`.
- Produces:
  - `type DiagramData = { kind: "diagram"; version: 1; diagramId: string; diagramType: DiagramType; code: string; settings: DiagramSettings }`
  - `isDiagramFrame(el: ExcalidrawElement): boolean`
  - `readDiagram(el: ExcalidrawElement): DiagramData | null` (null for anything that isn't a valid diagram frame, including a `version` it doesn't know)
  - `createDiagram(input: { code: string; diagramType: DiagramType; at: { x: number; y: number } }, elk?: ElkLike): Promise<{ elements: ExcalidrawElement[]; errors: DiagramError[] }>` — frame centred on `at`
  - `updateDiagram(scene: readonly ExcalidrawElement[], frameId: string, change: { code: string; diagramType?: DiagramType }, elk?: ElkLike): Promise<{ elements: ExcalidrawElement[]; errors: DiagramError[] }>` — returns the whole new scene
  - `claimCopies(scene: readonly ExcalidrawElement[]): ExcalidrawElement[] | null` (null when nothing needed changing)
  - `STARTERS: Record<DiagramType, string>` in `templates.ts` (flowchart: a 5-node checkout flow; cloud: a VPC group with load balancer, two services and a database)
  - `Tests/diagram/excalidrawEnv.ts`: sets `globalThis.FontFace`, `document.fonts` and `HTMLCanvasElement.prototype.getContext` (returning `measureText: t => ({ width: t.length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 })`); imported first in any test that converts elements.

- [x] **Step 1: Write the failing tests:**
  - `createDiagram` returns one frame whose `readDiagram` gives the code, type, `DEFAULT_SETTINGS`-merged settings and `diagramId === frame.id`; every other element has `frameId === frame.id` and `customData.diagramId === frame.id` (bound label texts too); frame `name` = the `title` setting or `"Diagram"`;
  - `updateDiagram` on a scene with two diagrams and a loose rectangle: only the target frame's old children come back `isDeleted: true` with `version` +1; the new children exist; the other diagram and the rectangle are identical objects; the frame keeps its x/y and resizes to fit (padding 20, minimum 200 × 120);
  - code with errors still updates the drawing from the good lines and returns the errors;
  - a duplicate gets a new `diagramId`: clone a diagram's frame and children with new ids and remapped `frameId` (what Excalidraw paste does) → `claimCopies` sets the copy's frame and children `diagramId` to the copy frame's id and leaves the original alone; calling it again returns `null`;
  - `readDiagram` on a frame with `customData.version: 2` returns `null`.
- [x] **Step 2: Run `npx jest Tests/diagram/block.test.ts` — expect FAIL.**
- [x] **Step 3: Implement.** `convertToExcalidrawElements(skeletons, { regenerateIds: true })`, then set `frameId` and `customData.diagramId` on every result (labels come back untagged). Update the frame's `customData`, size and `version`.
- [x] **Step 4: Run the tests — expect PASS. Then `npx tsc --noEmit`, `npm test`, `npm run build` (all green; `lib/diagram/block.ts` must not end up in the server bundle).**
- [x] **Step 5: Commit** `feat(diagram): diagram frame block - create, update, copies (stage 2.13, 2.14)`.

### Task 7: Code panel (2.15, panel part of 2.21, 2.23)

**Files:**
- Create: `app/(routes)/workspace/_components/diagram/codeMirrorSetup.ts`, `app/(routes)/workspace/_components/diagram/DiagramCodePanel.tsx`
- Modify: `package.json` (CodeMirror packages at the versions in the header), `app/(routes)/workspace/_components/workspace.css` (panel and bottom sheet)
- Test: `Tests/workspace/DiagramCodePanel.test.tsx`, `Tests/diagram/codeMirrorSetup.test.ts`

**Interfaces:**
- Consumes: `DiagramError`, `FlowModel` (node names for autocomplete).
- Produces:
  - `toDiagnostics(errors: DiagramError[], doc: { line(n: number): { from: number; to: number } }): Diagnostic[]` — severity `error`, spans the whole line
  - `diagramCompletions(nodeNames: string[]): CompletionSource` — inside `[ ]`: attribute keys `icon color shape label`, after `shape:` the shapes, after `color:` the colours; at line start: settings keys, after a settings key its values; elsewhere: node names
  - `<DiagramCodePanel code errors nodeNames readOnly onChange(code) onClose title? footer? />` — `onChange` debounced 150 ms; `role="complementary"`, `aria-label="Diagram code"`; footer shows "Diagram up to date" or "Line N: message" for the first error plus the count, and a "Syntax help" link to `/help/diagram-syntax` (new tab).

- [x] **Step 1: Install** the six `@codemirror/*` packages; check `npm audit`.
- [x] **Step 2: Write the failing tests:**
  - `toDiagnostics` maps line 2 to that line's `from`/`to`;
  - `diagramCompletions` gives `shape` inside `A [sh|`, `cylinder` after `shape: cy|`, `pastel` after `colorMode p|`, `Web Server` for `We|` at an edge position;
  - the panel renders the code; typing calls `onChange` once 150 ms after the last key (fake timers), not before;
  - `readOnly` makes the editor non-editable (`contenteditable="false"`) and still shows the code;
  - Escape and the close button call `onClose`;
  - errors show in the footer as `Line 3: …`.
  (jsdom lacks layout: stub `Range.prototype.getClientRects` / `getBoundingClientRect` in the test file.)
- [x] **Step 3: Run the tests — expect FAIL.**
- [x] **Step 4: Implement.** Highlighting with `StreamLanguage` (keywords for settings, operators `> < <> - -->`, `[ ]` attributes, strings, comments) on Graphite colours via a CodeMirror theme using the `--g-*` variables; `lintGutter` off, underlines via `setDiagnostics`. Desktop: floating right panel as in `designs/redesign/editor.html`; ≤ 767px: bottom sheet up to 50vh with the canvas visible above, editor text 16px, close button ≥ 44px.
- [x] **Step 5: Run the tests — expect PASS. Run `npx tsc --noEmit`.**
- [x] **Step 6: Commit** `feat(diagram): CodeMirror diagram code panel (stage 2.15, 2.23)`.

### Task 8: Wire diagrams into the canvas (2.16, 2.17, 2.21)

**Files:**
- Create: `app/(routes)/workspace/_components/diagram/useDiagramEditor.ts`
- Modify: `app/(routes)/workspace/_components/WSCanvas.tsx`
- Test: `Tests/workspace/useDiagramEditor.test.tsx`, `Tests/workspace/WSCanvas.test.tsx` (extend)

**Interfaces:**
- Consumes: `createDiagram`, `updateDiagram`, `readDiagram`, `claimCopies`, `isDiagramFrame`, `parseFlow`, `STARTERS`, `DiagramCodePanel`.
- Produces:
  - `useDiagramEditor(api: ExcalidrawImperativeAPI | null, opts: { readOnly: boolean; elk?: ElkLike }) => { active: { frameId: string; data: DiagramData } | null; errors: DiagramError[]; open(frameId: string): void; close(): void; insert(): Promise<void>; setCode(code: string): void; setType(t: DiagramType): void; onSceneChange(elements, appState): void }`
  - `viewCentre(appState: { scrollX: number; scrollY: number; zoom: { value: number }; width: number; height: number }): { x: number; y: number }`

- [x] **Step 1: Run `mcp__gitnexus__impact` on `WSCanvas` (upstream) and report the blast radius.**
- [x] **Step 2: Write the failing tests** (fake API object with `getSceneElements`, `getAppState`, `updateScene`, `setActiveTool`):
  - selecting a diagram frame, or any element whose `frameId` is a diagram frame, opens it; selecting a plain shape does not;
  - `close()` clears `active` and returns focus to the canvas container;
  - `insert()` puts a flowchart starter centred on `viewCentre` and opens it; `viewCentre({ scrollX: -100, scrollY: -50, zoom: { value: 2 }, width: 800, height: 600 })` → `{ x: 300, y: 200 }`;
  - `setCode` calls `updateScene` once with `captureUpdate: CaptureUpdateAction.IMMEDIATELY`;
  - **stale results:** with a fake ELK whose first call resolves after the second, two quick `setCode` calls end with the second code's drawing and `updateScene` is never called with the first;
  - **undo resync:** after `onSceneChange` delivers the frame with different `customData.code` than last sent, `active.data.code` is the frame's code;
  - `onSceneChange` with a pasted copy calls `updateScene` with `claimCopies`'s result (`captureUpdate: NEVER`), and does nothing when it returns `null`;
  - read-only: `setCode`, `setType` and `insert` do nothing; in `WSCanvas` with `readOnly` the Diagram button is absent, the "Diagram code" button shows only when the scene has a diagram, and the panel opens read-only.
- [x] **Step 3: Run the tests — expect FAIL.**
- [x] **Step 4: Implement the hook and wire `WSCanvas`:** pass `excalidrawAPI`, call `onSceneChange` from the existing `handleChange`, render a "Diagram" button (icon + text, ≥ 44px on phones) through `renderTopRightUI` when not read-only, the viewer "Diagram code" button and picker when read-only, and the panel when `active` is set. Keep the existing save flow untouched (diagram changes reach it through `onChange` like any edit).
- [x] **Step 5: Run the tests — expect PASS. Then `npx tsc --noEmit`, `npm test`, `npm run build`.**
- [x] **Step 6: Commit** `feat(diagram): diagrams on the canvas - insert, open, redraw, copies, viewers (stage 2.16, 2.17, 2.21)`.

### Task 9: Style bar (2.18)

**Files:**
- Create: `app/(routes)/workspace/_components/diagram/DiagramStyleBar.tsx`
- Modify: `DiagramCodePanel.tsx` (render the bar in the panel header, replacing the prototype's type select)
- Test: `Tests/workspace/DiagramStyleBar.test.tsx`

**Interfaces:**
- Consumes: `setSetting`, `parseSettings`, `useDiagramEditor().setCode / setType`.
- Produces: `<DiagramStyleBar code diagramType onCode(code) onType(t) />` — labelled selects: Type (Flowchart, Cloud architecture), Direction, Colour, Style, Font; each shows the current value read with `parseSettings`.

- [x] **Step 1: Write the failing tests:** choosing Direction "Down" calls `onCode` with `setSetting(code, "direction", "down")`; each select shows the value from the code (or the default); choosing Type calls `onType("cloud")` and leaves the code alone; every select has a visible label or `aria-label`.
- [x] **Step 2: Run — expect FAIL. Step 3: Implement** (native `<select>`s styled with `g-*`; wraps onto two rows at ≤ 767px). **Step 4: Run — expect PASS; `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): diagram style bar (stage 2.18)`.

### Task 10: Drag notice (2.19)

**Files:**
- Modify: `useDiagramEditor.ts`
- Test: `Tests/workspace/useDiagramEditor.test.tsx` (extend)

**Interfaces:**
- Produces: `movedDiagramChildren(prev: readonly ExcalidrawElement[], next: readonly ExcalidrawElement[]): boolean` — true when an element inside a diagram frame changed x or y while its frame did not move and the change was not our own redraw.

- [x] **Step 1: Write the failing tests:** moving one child → true; moving the whole frame with its children → false; our redraw → false; the hook shows the toast "Shapes in this diagram are redrawn from its code" once, and not again after `localStorage` holds `diagram-drag-notice-seen` (and still once, no crash, when `localStorage` throws).
- [x] **Step 2: Run — expect FAIL. Step 3: Implement** with `sonner`'s `toast`. **Step 4: Run — expect PASS; `npx tsc --noEmit`.**
- [x] **Step 5: Commit** `feat(diagram): notice when a diagram shape is dragged (stage 2.19)`.

### Task 11: Syntax help page (2.20)

**Files:**
- Create: `app/(routes)/help/diagram-syntax/page.tsx`
- Modify: `lib/auth/routes.ts` only if `isProtectedPath("/help/diagram-syntax")` is true (it must be public)
- Test: `Tests/auth/routes.test.ts` (extend: `/help/diagram-syntax` is not protected)

- [x] **Step 1: Write the failing test** for the route rule, run it (it may already pass — then keep it as a guard).
- [x] **Step 2: Write the page** (server component, Graphite styles, `BRAND_NAME` in the title): settings lines with every value, nodes and attributes, every shape, colours, groups, the 5 edge kinds, labels, chains, fan-out, comments, and both starter templates as examples. Every example must parse with no errors — add a test in `Tests/diagram/help-examples.test.ts` that imports the examples array from the page's data module (`app/(routes)/help/diagram-syntax/examples.ts`) and runs `parseFlow` on each.
- [x] **Step 3: Run the tests and `npx tsc --noEmit` — expect PASS.**
- [x] **Step 4: Commit** `docs(diagram): diagram syntax help page (stage 2.20)`.

### Task 12: Browser smoke tests and stage close (2.24, 2.25, Verify)

**Files:**
- Modify: `Plan/redesign-eraser-canvas-tasks.md` (tick tasks, record elkjs and CodeMirror versions, note the 2.20 change), this plan's frontmatter

- [x] **Step 1: Run `npx tsc --noEmit`, `npm test`, `npm run build` — all green.**
- [x] **Step 2: Browser smoke (web-ui-test skill), dev server, signed-in test file:**
  - paste a Mermaid flowchart with Excalidraw's built-in "Mermaid to Excalidraw": it becomes normal shapes, no diagram frame (2.24);
  - Diagram button → type a 15-node cloud diagram → change every style bar option → undo and redo (panel code follows) → copy and paste the diagram and edit the copy (original unchanged) → Save → reload (same drawing, same code) → export PNG and SVG from the header (2.25);
  - paste `bigFlow(150)` code: typing stays smooth (no frame over 100 ms in a performance trace while typing);
  - drag one shape inside a diagram: notice shows once;
  - shared view link: Diagram button hidden, code panel read-only;
  - widths 320, 375, 767, 768, 1024, 1280 in light and dark: bottom sheet at ≤ 767px, no sideways scroll, labels readable.
- [x] **Step 3: Fix anything found, with a failing test first where it is logic.**
- [x] **Step 4: End-of-stage review on Opus (superpowers:requesting-code-review) over the whole stage diff; fix confirmed findings.**
- [x] **Step 5: Update the task file and commit** `chore: stage 2 complete - typed diagrams core`.
- [ ] **Step 6: [User] Deploy with the eraser-deploy skill once the user says yes, then the user tries a diagram on the live site.**

## Open after Stage 2

- **[User] Hand check:** click a shape inside a diagram and drag it with the mouse; the whole diagram (outline and shapes) must move together. The automated browser could not drive a real drag.
- **Double-click into a diagram** no longer enters the shape group (clicking a shape now selects the whole diagram), so double-click edits the shape's label in place, and that text is replaced at the next redraw. Ctrl/Cmd+click still reaches a single shape. Untested fix idea: keep the diagram's group selected when switching the selection to the frame (`selectedGroupIds: { [frameId]: true }`), then check click, drag and double-click in the browser.
- Minor, not blocking: selecting a plain shape together with a diagram shape keeps only the diagram; an undo on a non-active diagram during its pending redraw can be overwritten; typing in the last 150 ms before leaving the page is not drawn.
- The test file "Stage 2 smoke test" (live database) holds two leftover shapes from the fixed drag bug; delete the file when no longer needed.
