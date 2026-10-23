---
Title: Plan — Graphite redesign and Eraser-style canvas
Description: Turns the app into an Eraser.io-style product named Draftboard: Graphite look across all screens, one Excalidraw canvas
  (upgraded to 0.18) with typed-diagram blocks (flowchart, cloud architecture, sequence, ER, BPMN) laid out by ELK, a code panel,
  diagram style options and the full AWS / Azure / Google Cloud / Kubernetes icon sets. Editor ships first, then dashboard, login and landing.
  Live collaboration and AI diagrams are later stages, outside this plan. Decisions from the user on 2026-10-23; tasks in redesign-eraser-canvas-tasks.md.
Status: Draft, awaiting user review
Updated: 2026-10-23
---

# Graphite redesign and Eraser-style canvas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Each stage gets its own detailed test-first step plan (superpowers:writing-plans) when it starts; the task file below is the master list.

**Goal:** Ship Draftboard, a Graphite-styled docs-and-diagrams app whose canvas works like Eraser.io: freehand Excalidraw drawing plus typed diagrams that arrange themselves.

**Architecture:** One Excalidraw canvas per file, stored as today in `files.whiteboard` (jsonb element list). A typed diagram is an Excalidraw **frame** whose `customData` holds `{ kind: "diagram", version: 1, diagramType, code, settings }`. Its contents are generated elements grouped together and tagged `customData.diagramId`. Editing the code re-parses, re-runs ELK and replaces the frame's children. Parsing, layout and element generation are pure TypeScript under `lib/diagram/` so they are unit-tested without a browser.

**Tech stack:** Next.js 14.2 (latest patch), React 18, `@excalidraw/excalidraw` 0.18.x, `elkjs` 0.12 (in a web worker), CodeMirror 6 for the code panel, Supabase (unchanged), Tailwind tokens.

**Spec / evidence:**
- `designs/redesign/*.html` is the approved look (Graphite).
- `Docs/eraser-canvas-analysis.md` records how Eraser is built.

## Decisions

| Topic | Decision | By |
|---|---|---|
| Look | Graphite (dark first, light mode kept), every screen | User |
| Canvas | Exactly like Eraser: one Excalidraw canvas plus typed-diagram blocks | User |
| Diagram types | Flowchart, cloud architecture, sequence, ER, BPMN | User |
| Rollout | Editor first, then dashboard, login, landing | User |
| Live editing | Later stage, not in this plan (canvas data shape stays sync-friendly) | User |
| Cloud icons | Full AWS, Azure, Google Cloud and Kubernetes sets | User |
| AI diagrams | Later stage, not in this plan | User |
| Name | Draftboard, kept in one constant `lib/brand.ts` | User |
| Diagram container | Excalidraw frame + `customData` (upstream has no custom element types; frames move, select and label as one unit) | Agent |
| Code editor | CodeMirror 6, not Monaco (Eraser uses Monaco, but CodeMirror is much smaller and does what the panel needs: highlighting, autocomplete, error underlines) | Agent |
| Diagram text language | Our own Eraser-like syntax (below), not copied from Eraser | Agent |
| Manual edits inside a diagram | The diagram's shapes stay grouped. Code is the source of truth, so changing the code redraws them, and the panel says so. | Agent |
| Icons storage | Static SVGs in `public/icons/<provider>/` with a JSON manifest. Canvas image elements use the file id `icon:<name>`, filled from the manifest on load, never saved to the database. | Agent |
| Document pane | Keep Editor.js, restyled. Replacing it is not needed for the Eraser canvas. | Agent |
| Dashboard views | Starred needs a new `file_stars` table. Recent means last edited (`updated_at`). The plan meter shows a file count until limits exist. | Agent |
| Route folder typo `wokspace` | Renamed to `workspace` in the Supabase migration (old URLs redirect) | Agent |

## Diagram text language (summary)

Settings lines (any diagram): `title <text>`, `direction right|down|left|up`, `colorMode pastel|bold|outline`, `styleMode plain|shadow|watercolor`, `typeface rough|clean|mono`.

- **Flowchart and cloud architecture.**
  - A node is `Name [icon: aws-s3, color: blue, shape: cylinder, label: "Text"]`.
  - A group is `Name [attrs] { …nodes… }`, and groups can nest.
  - Edges:
    - `A > B` arrow;
    - `A < B` reverse arrow;
    - `A <> B` both ways;
    - `A - B` plain line;
    - `A --> B` dashed;
    - add a label with `: text`;
    - chain them (`A > B > C`) or fan out (`A > B, C`).
  - Shapes: rectangle, cylinder, diamond, document, ellipse, hexagon, oval, parallelogram, star, trapezoid, triangle.
- **Sequence.**
  - Messages: `A > B: message`, `A --> B: reply`.
  - Activation: `activate A` and `deactivate A`.
  - Blocks: `loop [label] { }`, `alt [label] { } else [label] { }`, `opt [label] { }`, `par [label] { } and { }`.
- **ER.**
  - A table is `users [icon: …] { id string pk; email string unique; team_id uuid fk }`.
  - Relations:
    - `users.id < posts.user_id`: one to many;
    - `-`: one to one;
    - `<>`: many to many.
- **BPMN.**
  - A pool is `Pool { Lane { Task } }`.
  - Node kinds: `[type: task|event|start|end|gateway|subprocess]`.
  - Edges work as in a flowchart.

Unknown lines produce a per-line error ("Line 12: …") and never stop the rest of the diagram from drawing.

## Global constraints

- Login and data stay on Supabase only. No Convex, Kinde, React Flow or tldraw.
- New tables or storage buckets get row-level security in their own migration, with grants to `authenticated` only. Run `supabase/tests/rls.sql` before applying.
- Every new package must be actively maintained and free of known critical CVEs (Rule 17). Check versions at install time and record them in the task file.
- Checks for every task: `npx tsc --noEmit`, `npm test`, `npm run build`. ESLint is not set up yet.
- Diagram parsing, layout and element generation must stay free of React, DOM and Excalidraw runtime imports, so Jest runs them in node.
- Text contrast 4.5:1 in both modes; tap targets ≥ 44px at ≤ 767px; no sideways page scroll at 320px; `prefers-reduced-motion` respected.
- Breakpoints stay 475 / 640 / 768 / 1024 / 1280 / 1536 (`lib/design-tokens.ts`).

## Review focus (tests that must exist in the owning task)

1. **Broken or half-typed code.** A missing `}`, an edge to an undefined node or an unknown attribute still draws everything else and lists one error per bad line (Stage 2 parser tests).
2. **Big diagrams.** 150 nodes or more lay out in under 1.5 s and stay responsive because ELK runs in a worker (Stage 2 layout test with a 150-node fixture).
3. **Old files.** A whiteboard saved by Excalidraw 0.17.6 opens unchanged after the upgrade (Stage 0 fixture test with a real saved file).
4. **Pasting.** A copied diagram frame keeps its code and becomes an independent diagram with a new `diagramId` (Stage 2 duplicate test).
5. **Icon misses.** An unknown icon name falls back to a generic box icon and reports an error. A slow icon load never blocks drawing (Stage 3 tests).

## Stages

| Stage | Outcome | Depends on |
|---|---|---|
| 0 Foundations | Security upgrades (Next patch, Excalidraw 0.18), Graphite tokens and fonts, brand constant | Supabase migration branch merged |
| 1 New editor | Graphite editor shell: header, Document/Both/Canvas, doc pane, themed canvas, saved pasted images | 0 |
| 2 Typed diagrams core | Flowchart and cloud architecture with code panel, ELK, style options | 1 |
| 3 Cloud icons | Full AWS, Azure, Google Cloud and Kubernetes icon sets with search | 2 |
| 4 Sequence diagrams | Sequence type | 2 |
| 5 ER diagrams | ER type with crow's-foot arrows | 2 |
| 6 BPMN diagrams | BPMN type with pools and lanes | 2 |
| 7 Dashboard | Graphite dashboard plus restyled share, invite, team and privacy pages | 0 |
| 8 Login screens | Graphite log in, sign up, forgot and new password | 0 |
| 9 Landing page | Graphite home page | 2 (needs real diagram visuals) |
| Later (separate plans) | Recorded in `Plan/later-backlog.md`: live collaboration, AI diagrams, plan limits and payments, comments, version history, diagrams inside the document, marketing pages, smaller items | 2 |

Stages 4, 5 and 6 are independent of each other and can run in parallel. Stages 7 and 8 can also run in parallel with stages 2 to 6.

## Risks

- **Excalidraw 0.18 is ESM-only and needs its CSS imported.** It may need `transpilePackages` in Next 14. Stage 0 proves this before anything else is built.
- **Cloud icon licences.** AWS, Microsoft and Google allow their icons to be used in architecture diagrams. Bundling them inside a product is a grey area: diagramming tools commonly do it, but there is no open licence. Kubernetes icons are CC-BY-4.0 and need attribution. This is a user decision, already taken (full sets), and recorded here.
- **Eraser's exact behaviour is not fully known.** The analysis was static only. Its typing rules and how manual edits survive are unknowns, and our own rules fill the gap.
- **Bundle size.** Excalidraw, ELK and CodeMirror only load on the editor route, with dynamic imports and ELK in a worker.
