// The one diagram file that imports the Excalidraw runtime: browser only (load through the canvas's
// next/dynamic import, never from server code).
import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw'
import type {
  ExcalidrawElement,
  ExcalidrawFrameElement,
} from '@excalidraw/excalidraw/element/types'
import type { ElkLike } from './layout/elkWorker'
import { layoutFlow } from './layout/flow'
import { parseFlow } from './parse/flow'
import { toSkeletons } from './render/flow'
import type { DiagramData, DiagramError, DiagramType } from './types'

const PADDING = 20
const MIN_WIDTH = 200
const MIN_HEIGHT = 120
const DIAGRAM_TYPES: readonly string[] = ['flowchart', 'cloud'] satisfies DiagramType[]

type Result = { elements: ExcalidrawElement[]; errors: DiagramError[] }
type Drawing = Awaited<ReturnType<typeof draw>>

export function isDiagramFrame(el: ExcalidrawElement): boolean {
  return el.type === 'frame' && el.customData?.kind === 'diagram'
}

export function readDiagram(el: ExcalidrawElement): DiagramData | null {
  if (!isDiagramFrame(el)) return null
  const d = el.customData!
  const valid =
    d.version === 1 &&
    typeof d.diagramId === 'string' &&
    typeof d.code === 'string' &&
    DIAGRAM_TYPES.includes(d.diagramType) &&
    typeof d.settings === 'object' &&
    d.settings !== null
  return valid ? (d as DiagramData) : null
}

async function draw(code: string, elk?: ElkLike) {
  const { model, errors } = parseFlow(code)
  const positioned = await layoutFlow(model, model.settings, elk)
  return {
    positioned,
    settings: model.settings,
    errors,
    width: Math.max(MIN_WIDTH, positioned.width + 2 * PADDING),
    height: Math.max(MIN_HEIGHT, positioned.height + 2 * PADDING),
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
    x: frame.x + (drawing.width - drawing.positioned.width) / 2,
    y: frame.y + (drawing.height - drawing.positioned.height) / 2,
  }
  const skeletons = toSkeletons(drawing.positioned, drawing.settings, origin, frame.id)
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
  const drawing = await draw(input.code, elk)
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

// Returns the whole new scene: old children deleted (version bumped, for sync), new ones placed
// right before the frame, every other element the same object.
export async function updateDiagram(
  scene: readonly ExcalidrawElement[],
  frameId: string,
  change: { code: string; diagramType?: DiagramType },
  elk?: ElkLike,
): Promise<Result> {
  const frame = scene.find((el) => el.id === frameId) as ExcalidrawFrameElement | undefined
  const data = frame && readDiagram(frame)
  if (!frame || !data) return { elements: [...scene], errors: [] }

  const drawing = await draw(change.code, elk)
  const fields = frameFields(drawing, frame.id, change.code, change.diagramType ?? data.diagramType)
  const elements = scene.flatMap((el) => {
    if (el === frame) return [...children(drawing, frame), newElementWith(frame, fields)]
    if (el.frameId === frame.id && !el.isDeleted) return [newElementWith(el, { isDeleted: true })]
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
    const owner = copies.has(el.id) ? el.id : el.frameId && copies.has(el.frameId) ? el.frameId : null
    if (!owner) return el
    return newElementWith(el, {
      customData: { ...el.customData, diagramId: owner },
      ...(el.type === 'frame' ? {} : { groupIds: [owner] }),
    })
  })
}
