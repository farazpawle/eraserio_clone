---
Title: How Eraser.io's canvas is built
Description: Findings from statically analysing Eraser.io's public web bundles (2026-10-23): the canvas is an Excalidraw fork, typed diagrams are a custom "diagram" element laid out with ELK, plus diagram types, style options, shapes, icons and storage. Observations vs inferences vs unknowns, and what it means for our rebuild.
---

# How Eraser.io's canvas is built

**Method.** Downloaded the public JavaScript that `app.eraser.io` serves to any visitor
(build `D7umDKa0U3uvwj7IuRWkM`: the workspace, playground and dom-canvas route chunks plus all
78 lazy-loaded chunks, 13 MB). Ran REA `analyze-javascript-application` 6.7.0 over them
(Evidence `ev_b736ad01a49f694ab174254b40c41ff65bef62ea42f606f9e75dd1f8908a3973`), then
searched the same files for library and feature strings. Nothing was executed. No logged-in session was observed:
the browser extension was disconnected. We study behaviour only; none of Eraser's code is copied.

REA's analysis is aimed at Electron apps (IPC, preload, windows); on this web bundle it
produced a module graph with several "result budget" truncations but no feature-level
findings. The findings below come from the string searches.

## Observed (strings present in the shipped code)

| Area | Evidence in bundles |
|---|---|
| Canvas engine | Excalidraw fork: `excalidraw-main-canvas`, `excalidraw-cursor-element`, `excalidraw/clipboard` clipboard type, `#excalidraw-context-menu`, Virgil hand-drawn font (16 hits), `excalidrawApi` passed into a `makeCanvasAccessor` |
| Typed diagrams on the canvas | A custom element `type:"diagram"` (35 hits); clipboard carries `diagramMetadata` with `diagramType`; "freeform" vs "excalidraw" element sets kept side by side |
| Diagram types | `flowchart-diagram`, `sequence-diagram`, `entity-relationship-diagram`, `cloud-architecture-diagram`, `bpmn-diagram` |
| Auto-layout | ELK (`elk.padding`, `algorithm:"layered"`, `hierarchyHandling:"INCLUDE_CHILDREN"`, `partitioning.partition`, `algorithm:"box"`) |
| Arrows | `cardinalElbow` (elbow/orthogonal connectors) |
| Diagram styling | `colorMode` = pastel / bold / outline; `styleMode` = plain / shadow / watercolor; `typeface` = rough / clean / mono; `direction` |
| Node shapes | rectangle, cylinder, diamond, document, ellipse, hexagon, oval, parallelogram, star, trapezoid, triangle |
| Icons | ~579 named `aws-*` / `gcp-*` / `azure-*` / `k8s-*` icons |
| Code editor | Monaco (2,500+ hits) |
| Storage and sync | Firebase and Firestore (177 and 114 hits); Yjs and Automerge mentioned a few times |
| Other | Mermaid (import), `OffscreenCanvas` (rendering/export) |

## Inferences (likely, not proven)

- A typed diagram is one selectable object on the Excalidraw canvas. Editing its code
  re-runs ELK and redraws its contents, while freehand shapes stay around it.
- The diagram's colour, style and font options apply to the whole diagram object.
- Live sync runs through Firestore rather than a dedicated sync server.

## Unknowns

- Exact DSL grammar (parser not traced), how manual edits to a diagram's boxes are kept
  after the code changes, and the real-time conflict model. Needs a logged-in runtime session.

## What it means for this project

Being "exactly like Eraser" means **keeping Excalidraw as the single canvas** (upgrade from
0.17.6) and adding a typed-diagram object on it. Our text is parsed and laid out with
`elkjs`, then drawn as Excalidraw elements that share one group and carry the source code in
`customData`. Selecting the group opens the code panel. React Flow is no longer needed.
