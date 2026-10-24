// The one diagram file that imports the Excalidraw runtime: browser only (load through the canvas's
// next/dynamic import, never from server code).
import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import type {
  ExcalidrawElement,
  ExcalidrawFrameElement,
} from '@excalidraw/excalidraw/element/types'
import { loadRegistry } from './icons/registry'
import { resolveIcons } from './icons/resolve'
import type { ElkLike } from './layout/elkWorker'
import { layoutFlow } from './layout/flow'
import { layoutSequence } from './layout/sequence'
import { parseFlow } from './parse/flow'
import { parseSequence } from './parse/sequence'
import { toSkeletons } from './render/flow'
import { toSequenceSkeletons } from './render/sequence'
import {
  DIAGRAM_TYPES,
  syntaxOf,
  type DiagramData,
  type DiagramError,
  type DiagramSettings,
  type DiagramType,
} from './types'

const PADDING = 20
const MIN_WIDTH = 200
const MIN_HEIGHT = 120
const NOT_FOUND: DiagramError = { line: 0, message: 'Diagram not found' } // line 0: no code line

type Result = { elements: ExcalidrawElement[]; errors: DiagramError[] }

export function isDiagramFrame(el: ExcalidrawElement): boolean {
  return el.type === 'frame' && el.customData?.kind === 'diagram'
}

// A shape drawn from the frame's code (it carries the frame's diagramId); shapes the user dropped
// into the frame do not. Defaults to the element's own frame.
export function isGeneratedChild(el: ExcalidrawElement, frameId = el.frameId): boolean {
  return !!frameId && el.frameId === frameId && el.customData?.diagramId === frameId
}

export function readDiagram(el: ExcalidrawElement): DiagramData | null {
  if (!isDiagramFrame(el)) return null
  const d = el.customData!
  const valid =
    d.version === 1 &&
    typeof d.diagramId === 'string' &&
    typeof d.code === 'string' &&
    (DIAGRAM_TYPES as readonly string[]).includes(d.diagramType) &&
    typeof d.settings === 'object' &&
    d.settings !== null
  return valid ? (d as DiagramData) : null
}

type Origin = { x: number; y: number }
type Drawing = {
  settings: DiagramSettings
  errors: DiagramError[]
  width: number
  height: number
  // The shapes for a frame whose top-left content corner is `origin`.
  skeletons: (origin: Origin, frameId: string) => ExcalidrawElementSkeleton[]
  contentWidth: number
  contentHeight: number
}

const framed = (contentWidth: number, contentHeight: number) => ({
  contentWidth,
  contentHeight,
  width: Math.max(MIN_WIDTH, contentWidth + 2 * PADDING),
  height: Math.max(MIN_HEIGHT, contentHeight + 2 * PADDING),
})

async function draw(code: string, type: DiagramType, elk?: ElkLike): Promise<Drawing> {
  if (syntaxOf(type) === 'sequence') {
    const { model, errors } = parseSequence(code)
    const positioned = layoutSequence(model, model.settings)
    return {
      settings: model.settings,
      errors,
      ...framed(positioned.width, positioned.height),
      skeletons: (origin, id) => toSequenceSkeletons(positioned, model.settings, origin, id),
    }
  }
  const parsed = parseFlow(code)
  // No manifest (offline, not built yet) means the names stay as typed; drawing does not wait on icons.
  const registry = await loadRegistry().catch(() => null)
  const { model, errors: iconErrors } = resolveIcons(parsed.model, registry)
  const positioned = await layoutFlow(model, model.settings, elk)
  return {
    settings: model.settings,
    errors: [...parsed.errors, ...iconErrors].sort((a, b) => a.line - b.line),
    ...framed(positioned.width, positioned.height),
    skeletons: (origin, id) => toSkeletons(positioned, model.settings, origin, id),
  }
}

const frameFields = (drawing: Drawing, frameId: string, code: string, diagramType: DiagramType) => ({
  width: drawing.width,
  height: drawing.height,
  name: drawing.settings.title ?? 'Diagram',
  customData: {
    kind: 'diagram',
    version: 1,
    diagramId: frameId,
    diagramType,
    code,
    settings: drawing.settings,
  } satisfies DiagramData,
})

// The drawing's shapes centred in a frame at `x, y`, all tagged as that frame's children. The
// converter leaves bound label texts without frameId or diagramId, so every element is re-tagged.
function children(drawing: Drawing, frame: { id: string; x: number; y: number }): ExcalidrawElement[] {
  const origin = {
    x: frame.x + (drawing.width - drawing.contentWidth) / 2,
    y: frame.y + (drawing.height - drawing.contentHeight) / 2,
  }
  const skeletons = drawing.skeletons(origin, frame.id)
  return convertToExcalidrawElements(skeletons, { regenerateIds: true }).map((el) => ({
    ...el,
    frameId: frame.id,
    customData: { ...el.customData, diagramId: frame.id },
    groupIds: [frame.id],
  }))
}

export async function createDiagram(
  input: { code: string; diagramType: DiagramType; at: { x: number; y: number } },
  elk?: ElkLike,
): Promise<Result> {
  // Fractional indices are left unset: pass the elements through api.updateScene before saving.
  const drawing = await draw(input.code, input.diagramType, elk)
  const [frame] = convertToExcalidrawElements([{ type: 'frame', children: [] }])
  // Set after converting: the converter treats an x or y of 0 as "fit to children".
  Object.assign(frame, {
    x: input.at.x - drawing.width / 2,
    y: input.at.y - drawing.height / 2,
    ...frameFields(drawing, frame.id, input.code, input.diagramType),
  })
  // Excalidraw keeps a frame's children right before the frame.
  return { elements: [...children(drawing, frame), frame], errors: drawing.errors }
}

// Returns the whole new scene: old generated children deleted (version bumped, for sync), new
// ones placed right before the frame, every other element (shapes the user put in the frame too)
// the same object. Fractional indices are repaired by api.updateScene: pass the scene through it
// before saving. Pass a getter for a live scene: it is read again after the layout, so edits made
// on the canvas meanwhile are kept.
export async function updateDiagram(
  sceneOrGetter: readonly ExcalidrawElement[] | (() => readonly ExcalidrawElement[]),
  frameId: string,
  change: { code: string; diagramType?: DiagramType },
  elk?: ElkLike,
): Promise<Result> {
  const read = typeof sceneOrGetter === 'function' ? sceneOrGetter : () => sceneOrGetter
  const target = (scene: readonly ExcalidrawElement[]) => {
    const frame = scene.find((el) => el.id === frameId) as ExcalidrawFrameElement | undefined
    const data = frame && !frame.isDeleted ? readDiagram(frame) : null
    return frame && data ? { frame, data } : null
  }
  // Checked before the layout too, so a missing frame costs no layout.
  const before = target(read())
  if (!before) return { elements: [...read()], errors: [NOT_FOUND] }

  const type = change.diagramType ?? before.data.diagramType
  const drawing = await draw(change.code, type, elk)
  const scene = read()
  const found = target(scene)
  if (!found) return { elements: [...scene], errors: [NOT_FOUND] }
  const { frame, data } = found
  const fields = frameFields(drawing, frame.id, change.code, type)
  const elements = scene.flatMap((el) => {
    if (el === frame) return [...children(drawing, frame), newElementWith(frame, fields)]
    if (isGeneratedChild(el, frame.id) && !el.isDeleted) return [newElementWith(el, { isDeleted: true })]
    return [el]
  })
  return { elements, errors: drawing.errors }
}

// A pasted diagram frame gets a new id but keeps the original's diagramId; give it and its
// children their own. Returns null when nothing changed.
export function claimCopies(scene: readonly ExcalidrawElement[]): ExcalidrawElement[] | null {
  // Frames of an unknown version read as null and are left alone.
  const isCopy = (el: ExcalidrawElement) => {
    const data = readDiagram(el)
    return data !== null && data.diagramId !== el.id
  }
  const copies = new Set(scene.filter(isCopy).map((el) => el.id))
  if (copies.size === 0) return null
  return scene.map((el) => {
    // Only generated children carry a diagramId; shapes the user added to the copy stay as they are.
    // Not isGeneratedChild: a copy's shapes still carry the original's diagramId, so any one counts.
    const generated = el.frameId && copies.has(el.frameId) && el.customData?.diagramId !== undefined
    const owner = copies.has(el.id) ? el.id : generated ? el.frameId : null
    if (!owner) return el
    return newElementWith(el, {
      customData: { ...el.customData, diagramId: owner },
      ...(el.type === 'frame' ? {} : { groupIds: [owner] }),
    })
  })
}
