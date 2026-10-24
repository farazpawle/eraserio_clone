---
Title: Stage 4 step plan — Sequence diagrams
Description: Test-first step plan for Stage 4 of the Graphite redesign. Adds the third diagram type, "sequence" (participants, solid and dashed messages, activation bars, loop/alt/opt/par blocks),
  with its own parser, plain column/row layout (no ELK), Excalidraw rendering, a starter example, type-menu swapping, code-panel autocomplete and help-page section.
  Master list is Plan/redesign-eraser-canvas-tasks.md (tasks 4.1-4.6).
Total Tasks: 7
Status: Tasks 1-6 done in code and tested (tsc, 796 tests, build green); Task 7 waits for the browser check
Updated: 2026-10-24
---

# Stage 4 — Sequence diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choosing "Sequence" in the diagram type menu gives a ready example; typing `Browser > API: login` / `API --> Browser: token` draws participants, lifelines, arrows, activation bars and loop/alt/opt/par frames on the canvas.

**Architecture:** A new syntax family beside flow. `parse/sequence.ts` → `layout/sequence.ts` (plain maths, synchronous) → `render/sequence.ts` (Excalidraw skeletons). `block.ts` picks the pipeline by `diagramType`; a small `parse/index.ts` gives the UI one `parseDiagram(type, code)` for errors and autocomplete names. Flowchart and cloud keep sharing one syntax; sequence is the second.

**Tech Stack:** Next.js 14.2.35, `@excalidraw/excalidraw` 0.18.1, CodeMirror 6, Jest — all already installed. No new packages.

**Spec:** `Plan/redesign-eraser-canvas-plan.md` ("Diagram text language" → Sequence), `Plan/redesign-eraser-canvas-tasks.md` Stage 4 (4.1–4.6), `Plan/stage-2-diagrams-plan.md` (the code this builds on).

## Decisions made while planning

| Topic | Decision | By |
|---|---|---|
| Starting a sequence diagram | The style bar's Type menu swaps in the sequence example (undo restores the old text). Flowchart ↔ Cloud keep the text (same syntax). Same rule is reused for ER and BPMN. | User (2026-10-24) |
| Syntax | Participants: a line `Name` or `Name [label: "Text", color: blue]`; also created on first use in a message. Messages: `A > B: text` (solid), `A --> B: text` (dashed), label optional, `A > A` is a self message. `activate A` / `deactivate A`. Blocks: `loop [label] {`, `alt [label] {`, `} else [label] {`, `opt [label] {`, `par [label] {`, `} and [label] {`, closing `}`. Blocks nest. `//` comments and the settings lines work as in flow. | Agent (from the master plan) |
| Participant order | Order of first appearance (declaration or first message). | Master plan |
| Attributes | `label` and `color` only. `shape` and `icon` on a participant give a line error. | Agent |
| Settings | `title`, `colorMode`, `styleMode`, `typeface` apply. `direction` is accepted and ignored; the style bar hides it for sequence. Icons are not supported (the icon picker is hidden). | Agent |
| Layout | No ELK. Participant boxes in a header row, one row per message, columns widened when a message label is wider than the gap it spans. | Master plan |
| Reuse | `parse/flow.ts` exports its text helpers (`parseNamed`, `indexOutside`, `splitOutside`, `stripComment`, `unquote`) instead of copying them. `render/flow.ts`'s `fillOf` moves to `render/style.ts` so both renderers share it. | Agent |
| Arrows | Plain arrows with explicit points, not bound to shapes (lifelines are lines; Excalidraw cannot bind to them). Moving a participant by hand does not drag its arrows — the diagram is redrawn from code anyway. | Agent |
| Known ceilings | Highlighting treats `loop`/`alt`/`opt`/`par`/`activate`/`deactivate` as keywords in every diagram type (a flowchart node named `loop` is coloured as a keyword; drawing is unaffected). A message spanning many columns uses the evenly widened gaps; its label can sit over a middle lifeline. | Agent |

## Global Constraints

- Parse, layout and render files stay pure TypeScript (no React, DOM or Excalidraw runtime). `block.ts` stays the only diagram file importing `@excalidraw/excalidraw`.
- Every generated element carries `customData.diagramId` and `groupIds: [diagramId]`, ids `${diagramId}:<kind>:<name>` (as in `render/flow.ts`).
- Label text reaches 4.5:1 contrast: use `styleFor` colours and `CANVAS_TEXT` for text on the bare canvas (arrow labels, block labels).
- Broken code never stops the rest drawing; one error per bad line (`DiagramError {line, message}`, lines counted after the settings lines are blanked, as in `parseFlow`).
- Tests in `Tests/diagram/` (`@jest-environment node`), `Tests/workspace/`. Checks per task: `npx tsc --noEmit` and the task's tests; after tasks 4, 5 and 7: `npm test` and `npm run build`.
- GitNexus: `impact` (upstream) before changing `draw`/`createDiagram`/`updateDiagram` in `block.ts`, `toSkeletons`, `diagramCompletions`, `useDiagramEditor`, `DiagramStyleBar`, `DiagramCodePanel`; `detect_changes` before each commit.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Self message.** `A > A: think` draws a loop beside the lifeline, not a zero-length arrow (Task 3).
2. **Broken blocks.** `loop {` never closed, an extra `}`, and `else` outside an `alt` each give one error on their line and the rest still draws (Task 1).
3. **Activation mistakes.** `deactivate A` with no open activation gives an error; an activation never closed runs to the last row (Tasks 1 and 2).
4. **Wide labels.** A label wider than the gap between neighbours widens the gap; participant boxes never overlap (Task 2).
5. **Switching type.** Sequence ↔ Flowchart swaps in the starter and undo restores the old text; Flowchart ↔ Cloud keeps the text (Task 5).
6. **Empty code.** An empty sequence diagram draws an empty frame without throwing (Tasks 2 and 4).

## File Structure

| File | Responsibility |
|---|---|
| `lib/diagram/types.ts` (modify) | `'sequence'` in `DIAGRAM_TYPES`; sequence model types; `syntaxOf(type)` |
| `lib/diagram/parse/flow.ts` (modify) | `export` the five text helpers listed above (no behaviour change) |
| `lib/diagram/parse/sequence.ts` (new) | `parseSequence` |
| `lib/diagram/parse/index.ts` (new) | `parseDiagram(type, code): { errors, names }` for the UI |
| `lib/diagram/layout/sequence.ts` (new) | `layoutSequence` |
| `lib/diagram/render/style.ts` (modify) | receives exported `fillOf` |
| `lib/diagram/render/sequence.ts` (new) | `toSequenceSkeletons` |
| `lib/diagram/block.ts` (modify) | `draw` chooses the pipeline by type |
| `lib/diagram/templates.ts` (modify) | `STARTERS.sequence` |
| `app/(routes)/workspace/_components/diagram/*` and `WSCanvas.tsx` (modify) | type swap, labels, hidden controls, autocomplete |
| `app/(routes)/help/diagram-syntax/*` (modify) | sequence section and examples |
| `Tests/diagram/sequence-parse.test.ts`, `sequence-layout.test.ts`, `sequence-render.test.ts` (new) | pure tests |

---

### Task 1: Types and parser (4.1, 4.2)

**Files:** Modify `lib/diagram/types.ts`, `lib/diagram/parse/flow.ts` (exports only). Create `lib/diagram/parse/sequence.ts`, `Tests/diagram/sequence-parse.test.ts`.

**Interfaces:**
- Produces in `types.ts`:
  `SequenceParticipant {id; label; color?: ColorName; line}`,
  `SequenceMessage {kind:'message'; from; to; dashed: boolean; label: string; line}`,
  `SequenceActivation {kind:'activate'|'deactivate'; who; line}`,
  `SequenceBlockType = 'loop'|'alt'|'opt'|'par'`,
  `SequenceBranch {label: string; items: SequenceItem[]}` (first branch carries the block's own label; later ones the `else`/`and` labels),
  `SequenceBlock {kind:'block'; type; branches: SequenceBranch[]; line}`,
  `SequenceItem = SequenceMessage | SequenceActivation | SequenceBlock`,
  `SequenceModel {settings; participants; items}`,
  and `syntaxOf(type: DiagramType): 'flow' | 'sequence'`.
- Produces: `parseSequence(code: string): ParseResult<SequenceModel>` in `parse/sequence.ts`.

- [x] **Step 1: Write failing tests** in `Tests/diagram/sequence-parse.test.ts` (`parse = (...lines) => parseSequence(lines.join('\n'))`):
  - `'A > B: hi'` → participants `[A, B]` (ids = labels), one solid message with label `hi`; `'A --> B: ok'` → `dashed: true`; no label → `label: ''`.
  - Participants keep order of first appearance: `'C\nA > B\nB > C'` → `C, A, B`.
  - `'Browser [label: "Web browser", color: blue]'` → label `Web browser`, color `blue`; `[shape: oval]` and `[icon: aws-ec2]` each → one error on that line, participant still created.
  - `'activate A'` / `'deactivate A'` → items of kind `activate`/`deactivate`; `deactivate` with nothing open → error `"A is not active."`; an unclosed activation → no error.
  - `'loop [every minute] {\nA > B\n}'` → one block `loop`, one branch labelled `every minute` holding the message; nested `loop` inside `alt` keeps its place.
  - `alt [ok] {` … `} else [failed] {` … `}` → two branches; `par [x] {` … `} and {` … `}` → two branches, second label `''`.
  - Errors, each with the rest still parsed: `loop {` never closed → error on the `loop` line; extra `}` → error; `} else {` inside `loop` → error naming `alt`; `A >` (missing name) → error; `A > B > C` → error "one arrow per line"; a name with spaces (`Order service > Payments`) is accepted, a name with `[ ] { } < : ,` is an error (same rule as flow).
  - Settings: `'title Login\ndirection down\nA > B'` → `settings.title === 'Login'`; a bad `colorMode x` → error on line 1 via `parseSettings`.
  - `''` → no participants, no items, no errors.
- [x] **Step 2: Run** `npx jest Tests/diagram/sequence-parse.test.ts` — expect FAIL (module not found).
- [x] **Step 3: Add the types and `syntaxOf` to `types.ts`; add `'sequence'` to `DIAGRAM_TYPES`; add `export` to the five helpers in `parse/flow.ts`.**
- [x] **Step 4: Implement `parseSequence`** in `parse/sequence.ts`: `parseSettings` first (like `parseFlow`), then one pass over `rest` with a stack of open blocks. Line kinds in this order: blank/comment; `}` or `} else|and [label] {`; block opener (`/^(loop|alt|opt|par)\s*(\[(.*)\])?\s*\{$/`); `activate|deactivate <name>`; message (find `-->` first, then `>`, outside quotes and brackets with `indexOutside`; text after the first `:` outside quotes is the label, `unquote`d); otherwise a participant declaration through `parseNamed`. Participants are added by `ensure(name, attrs, line)`. A misplaced `else`/`and` pushes an entry that only keeps the braces balanced.
- [x] **Step 5: Run** the new test and `Tests/diagram/flow-parse.test.ts` — expect PASS (proves the `export` change is harmless).
- [ ] **Step 6: Commit** `feat(diagram): sequence parser`.

---

### Task 2: Layout (4.3, 4.4)

**Files:** Create `lib/diagram/layout/sequence.ts`, `Tests/diagram/sequence-layout.test.ts`. Modify `lib/diagram/types.ts`.

**Interfaces:**
- Consumes: `SequenceModel`, `Box` from `types.ts`.
- Produces in `types.ts`:
  `PositionedSequence {participants: (SequenceParticipant & Box)[]; lifelines: {id; x; y1; y2}[]; messages: (SequenceMessage & {y; x1; x2})[]; activations: {participant; x; y1; y2}[]; blocks: {type; label; x; y; width; height; depth; dividers: {y; label}[]}[]; width; height}` (all absolute, top-left of the whole drawing is 0,0).
- Produces: `layoutSequence(model: SequenceModel, settings: DiagramSettings): PositionedSequence` — synchronous, no ELK.

- [x] **Step 1: Write failing tests** (build models with `parseSequence(...).model`):
  - Participant boxes share one `y`, sorted left to right in model order, same height; no two boxes overlap; every box has `x >= 0`.
  - Message `y` values strictly increase in source order; a message's `x1`/`x2` are the centres of its `from`/`to` boxes (a message to the left has `x2 < x1`); a self message has `x2 > x1` (a loop to the right).
  - Lifelines start at the box bottom and end below the last message `y` (after the last message, also below the last activation bar).
  - A 90-character label between two adjacent participants makes their centre distance ≥ label width + 40 (versus a short label: smaller).
  - Activation: `activate B` / `A > B` / `B > A` / `deactivate B` → one bar on B's lifeline whose `y1` ≤ the first message `y` and `y2` ≥ the second; nested `activate B` twice → second bar is shifted right of the first; an unclosed activation ends at the lifeline end.
  - Blocks: `loop` around two messages → frame `y` above the first message and `y + height` below the second; frame `x`/`width` cover the lifelines of the participants used inside plus padding; a nested block has `depth` 1 and sits inside its parent's frame; `alt` with `else` → one divider with the else label, `y` between the branches' messages. An `alt` containing only `activate` still gets a non-zero height.
  - Fixture: 12 participants, 60 messages (round-robin pairs) → no two participant boxes overlap, message `y`s all distinct, every lifeline `y2` ≥ the last message `y`, and `width`/`height` equal the bounding box of everything.
  - Empty model → `{participants: [], …, width: 0, height: 0}`.
- [x] **Step 2: Run** `npx jest Tests/diagram/sequence-layout.test.ts` — expect FAIL.
- [x] **Step 3: Add `PositionedSequence` to `types.ts`.**
- [x] **Step 4: Implement `layoutSequence`.** Constants at the top of the file: header height 48, box width `clamp(label.length*8+32, 120, 200)`, message row 44 (arrow at row top + 32, label above it), self-message row 52 (loop 40 wide), block head 28, block end 12, divider row 28, block padding 16 per depth, activation bar 10 wide (shifted 5 per nesting level), minimum gap between boxes 40. Algorithm: (1) centre distances between neighbours start at `(wA + wB)/2 + 40`; (2) walk messages from narrowest span to widest and spread any shortfall (`label.length*7 + 40` minus the spanned distance) evenly over the gaps they span; (3) walk `items` recursively keeping a y cursor; blocks reserve head/divider/end rows, frame x-range is the union of the x-ranges of their contents ± 16, empty content falls back to the whole width; `activate`/`deactivate` take no height and mark the cursor; (4) shift everything so the minimum x is 0 and compute `width`/`height` from the bounding box. Mark with `// ponytail: …` that spanning labels widen gaps evenly only.
- [x] **Step 5: Run** the layout test — expect PASS.
- [ ] **Step 6: Commit** `feat(diagram): sequence layout`.

---

### Task 3: Rendering (4.5)

**Files:** Create `lib/diagram/render/sequence.ts`, `Tests/diagram/sequence-render.test.ts`. Modify `lib/diagram/render/style.ts`, `lib/diagram/render/flow.ts` (move `fillOf`).

**Interfaces:**
- Consumes: `PositionedSequence`, `DiagramSettings`, `styleFor`, `CANVAS_TEXT`.
- Produces: `toSequenceSkeletons(positioned: PositionedSequence, settings: DiagramSettings, origin: {x; y}, diagramId: string): ExcalidrawElementSkeleton[]`; exported `fillOf(style: ElementStyle)` in `render/style.ts`.

- [x] **Step 1: Write failing tests** (layout from Task 2 feeds the renderer; follow `Tests/diagram/render.test.ts` for how skeletons are inspected):
  - Every element has `customData.diagramId === diagramId` and `groupIds` `[diagramId]`; ids are unique.
  - One bound-label rectangle per participant (`label.text` is the participant label); lifelines are `line` elements with `strokeStyle: 'dashed'`.
  - A solid message → `arrow` with `endArrowhead: 'arrow'`, no dashed style; a dashed message → `strokeStyle: 'dashed'`; the message label is a separate text element above the arrow (a bound label would sit on the line), in `CANVAS_TEXT`; an unlabeled message has no text.
  - Arrow geometry: first point at `(x1 + origin.x, y + origin.y)`, last point offset by `x2 − x1`; `elbowed: false`, `roundness: null`.
  - A self message → an arrow with ≥ 3 points that returns to the lifeline side (last x equals first x, y larger).
  - Activation → a narrow filled `rectangle` at the bar's box; a block → a transparent-fill `rectangle` frame with a label `loop [every minute]` at top-left, plus a dashed `line` and a label for each divider; blocks come before lifelines in the array (drawn behind), participant boxes and arrows after.
  - `styleMode: 'shadow'` adds one backing rectangle per participant before the boxes; `watercolor` makes box `fillStyle` `'hachure'`.
  - Typeface and colour: a `color: red` participant gets the red stroke from `styleFor`.
- [x] **Step 2: Run** `npx jest Tests/diagram/sequence-render.test.ts` — expect FAIL.
- [x] **Step 3: Move `fillOf` from `render/flow.ts` into `render/style.ts` (exported); `render/flow.ts` imports it.** Run `Tests/diagram/render.test.ts` — still PASS (no behaviour change).
- [x] **Step 4: Implement `toSequenceSkeletons`** in the order blocks → lifelines → activation bars → participant boxes (with shadow backings first when `shadow`) → messages (so arrows and their labels sit on top).
- [x] **Step 5: Run** the render test — expect PASS.
- [ ] **Step 6: Commit** `feat(diagram): sequence rendering`.

---

### Task 4: Block pipeline, starter and parse dispatcher (4.6, part 1)

**Files:** Modify `lib/diagram/block.ts`, `lib/diagram/templates.ts`, `Tests/diagram/block.test.ts`, `Tests/diagram/help-examples.test.ts`, `Tests/diagram/icons-manifest.test.ts`. Create `lib/diagram/parse/index.ts`.

**Interfaces:**
- Consumes: `parseSequence`, `layoutSequence`, `toSequenceSkeletons`, existing flow functions.
- Produces: `parseDiagram(type: DiagramType, code: string): { errors: DiagramError[]; names: string[] }` (`names` = node ids for flow, participant ids for sequence); `STARTERS.sequence`; `createDiagram` / `updateDiagram` draw by `diagramType`.

- [x] **Step 1: Write failing tests.**
  - `block.test.ts`: `createDiagram({ code: 'A > B: hi', diagramType: 'sequence', at })` → a frame with `diagramType: 'sequence'`, children for both participants and the arrow, all tagged with the frame's id; `updateDiagram` with `{ code, diagramType: 'sequence' }` on a flowchart frame redraws it as sequence; an empty sequence code → frame at minimum size, `errors` empty.
  - `parseDiagram('sequence', 'A > B')` → `names` `['A','B']`; `parseDiagram('cloud', 'X > Y')` → `['X','Y']`; errors come through for both.
  - `STARTERS.sequence` parses with no errors, has at least 3 participants, one `alt` or `loop` block and one activation (assert on `parseSequence(...).model`).
  - Make the three tests that loop over `STARTERS` with `parseFlow` use `parseDiagram(type, code).errors` instead.
- [x] **Step 2: Run** `npx jest Tests/diagram` — expect the new tests FAIL.
- [x] **Step 3: Implement.**
  - `parse/index.ts`: switch on `syntaxOf(type)`.
  - `STARTERS.sequence` (checkout flow: `title Checkout`, Browser / Server / Payments, a `loop`-free happy path with `activate Server`, a dashed reply, and an `alt [paid] {` / `} else [declined] {` block).
  - `block.ts`: `draw(code, type, elk)` returns `{ settings, errors, width, height, skeletons(origin, frameId) }` so `children()` no longer needs the flow-specific `positioned`; flow branch keeps the icon resolution, sequence branch skips it. `updateDiagram` passes `change.diagramType ?? data.diagramType`.
- [x] **Step 4: Run** `npx jest Tests/diagram` then `npm test` and `npm run build` — expect PASS.
- [ ] **Step 5: Commit** `feat(diagram): draw sequence diagrams from the block`.

---

### Task 5: Editor wiring (4.6, part 2)

**Files:** Modify `app/(routes)/workspace/_components/diagram/useDiagramEditor.ts`, `DiagramStyleBar.tsx`, `DiagramCodePanel.tsx`, `codeMirrorSetup.ts`, `app/(routes)/workspace/_components/WSCanvas.tsx`; tests in `Tests/workspace/useDiagramEditor.test.tsx`, `DiagramStyleBar.test.tsx`, `DiagramCodePanel.test.tsx`, `Tests/diagram/codeMirrorSetup.test.ts`.

**Interfaces:**
- Consumes: `parseDiagram`, `syntaxOf`, `STARTERS`.
- Produces: `diagramCompletions(nodeNames: string[], icons?: Registry | null, type: DiagramType = 'flowchart')`; `DiagramCodePanel` takes a `diagramType` prop; the editor hook's `setType` swaps the starter when the syntax changes.

- [x] **Step 1: Write failing tests.**
  - Hook: on a flowchart diagram `setType('sequence')` → the frame's `code` equals `STARTERS.sequence` and `diagramType` is `'sequence'`; `setType('cloud')` from flowchart keeps the code; `setType('flowchart')` from sequence loads `STARTERS.flowchart`; undo (scene before the change) restores the old text; `errors` for a sequence diagram come from `parseSequence` (a code with a bad line shows that line).
  - Style bar: the Type menu lists "Sequence"; with `diagramType="sequence"` there is no Direction select and no Icon picker; with flowchart both are present.
  - Completions (`diagramCompletions(['A','B'], null, 'sequence')`): at a line start the options include `activate`, `deactivate`, `loop`, `alt`, `opt`, `par` and the settings keys; after `activate ` it offers `A` and `B`; inside `[ ]` the keys are only `label` and `color`; flowchart completions do not include `loop`.
  - Panel: highlighting marks `-->` as an operator and `loop` at line start as a keyword (extend the existing token test).
- [x] **Step 2: Run** the four test files — expect the new tests FAIL.
- [x] **Step 3: Implement.**
  - `useDiagramEditor`: `show()` uses `parseDiagram(data.diagramType, data.code).errors`; `setType` picks `STARTERS[type]` when `syntaxOf` differs, else keeps the code.
  - `DiagramStyleBar`: add `sequence: 'Sequence'` to `TYPE_LABELS`; hide Direction and the icon picker when `diagramType === 'sequence'`.
  - `codeMirrorSetup.ts`: sequence keywords in completions and the language's keyword rule; participants after `activate`/`deactivate`; attribute keys limited for sequence.
  - `DiagramCodePanel` and `WSCanvas`: pass `diagramType`; `nodeNames` come from `parseDiagram(type, code).names` (replace the `parseFlow` import in `WSCanvas.tsx`).
- [x] **Step 4: Run** the four test files, `npx tsc --noEmit`, `npm test`, `npm run build` — expect PASS.
- [ ] **Step 5: Commit** `feat(diagram): sequence type in the editor`.

---

### Task 6: Help page (part of 4.6)

**Files:** Modify `app/(routes)/help/diagram-syntax/examples.ts`, `page.tsx`; `Tests/diagram/help-examples.test.ts`.

- [x] **Step 1: Write failing test:** the examples list contains entries for "Sequence: messages", "Sequence: activation" and "Sequence: blocks"; each sequence example parses with `parseSequence(code).errors` equal to `[]` (extend the existing loop so sequence-titled examples use `parseSequence`, the rest `parseFlow`).
- [x] **Step 2: Run** `npx jest Tests/diagram/help-examples.test.ts` — expect FAIL.
- [x] **Step 3: Add the three examples** (plain-language notes: messages and dashed replies; `activate`/`deactivate`; `loop`/`alt`/`opt`/`par` with `else`/`and`) and one line in "Good to know" that sequence ignores `direction` and icons.
- [x] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `docs(diagram): sequence syntax on the help page`.

---

### Task 7: Check in the browser and close the stage

**Files:** Modify `Plan/redesign-eraser-canvas-tasks.md` (tick 4.1–4.6, update Status and Updated).

- [ ] **Step 1: Run** `npx tsc --noEmit`, `npm test`, `npm run build` — all green. (ESLint is not set up.)
- [ ] **Step 2: Browser smoke test** on a throwaway file the user has approved (local dev talks to the live database): insert a diagram, choose Sequence in the Type menu, check the example draws; type a self message, an `alt`/`else` block and `activate`/`deactivate`; break a brace and see one underlined line while the rest draws; undo the type switch; export PNG and SVG; copy and paste the diagram; save and reload. Check the code panel as a bottom sheet at 375 px and that a viewer sees it read-only.
- [ ] **Step 3: Paste the 12-participant, 60-message fixture** from Task 2 into the panel; typing stays smooth and nothing overlaps.
- [ ] **Step 4: Run** `mcp__gitnexus__detect_changes` and confirm only the expected symbols changed.
- [ ] **Step 5: Tick tasks 4.1–4.6 in the master list right after each passes review; commit** `chore: stage 4 complete - sequence diagrams`.
