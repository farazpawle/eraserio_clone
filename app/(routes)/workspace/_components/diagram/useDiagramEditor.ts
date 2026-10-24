import { useRef, useState } from 'react'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { toast } from 'sonner'
import { claimCopies, createDiagram, isDiagramFrame, readDiagram, updateDiagram } from '@/lib/diagram/block'
import type { ElkLike } from '@/lib/diagram/layout/elkWorker'
import { parseFlow } from '@/lib/diagram/parse/flow'
import { STARTERS } from '@/lib/diagram/templates'
import type { DiagramData, DiagramError, DiagramType } from '@/lib/diagram/types'

type Active = { frameId: string; data: DiagramData } | null
type View = { scrollX: number; scrollY: number; zoom: { value: number }; width: number; height: number }

// The scene point at the middle of the visible canvas.
export function viewCentre(s: View): { x: number; y: number } {
  return { x: -s.scrollX + s.width / 2 / s.zoom.value, y: -s.scrollY + s.height / 2 / s.zoom.value }
}

const NOTICE_KEY = 'diagram-drag-notice-seen'

type Positions = ReadonlyMap<string, { x: number; y: number }>

const isGenerated = (el: ExcalidrawElement) => !!el.frameId && el.customData?.diagramId === el.frameId

// Where each diagram frame and each of its generated shapes is. Excalidraw moves shapes by
// mutating them in place, so positions must be copied: kept element references would always
// match the current scene.
export function diagramPositions(elements: readonly ExcalidrawElement[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  for (const el of elements) {
    if (!el.isDeleted && (isDiagramFrame(el) || isGenerated(el))) out.set(el.id, { x: el.x, y: el.y })
  }
  return out
}

// True when a generated shape moved on its own while its frame stayed put. Our own redraw
// never counts: it gives the shapes new ids and deletes the old ones.
export function movedDiagramChildren(prev: Positions, next: readonly ExcalidrawElement[]): boolean {
  const now = diagramPositions(next)
  for (const el of next) {
    if (el.isDeleted || !isGenerated(el)) continue
    const old = prev.get(el.id)
    if (!old || (old.x === el.x && old.y === el.y)) continue
    const oldFrame = prev.get(el.frameId!)
    const frame = now.get(el.frameId!)
    if (oldFrame && frame && oldFrame.x === frame.x && oldFrame.y === frame.y) return true
  }
  return false
}

const stamp = (d: Pick<DiagramData, 'diagramType' | 'code'>) => `${d.diagramType}:${d.code}`

// The diagram whose frame, or one of whose shapes, is selected.
function selectedDiagram(elements: readonly ExcalidrawElement[], selected: AppState['selectedElementIds']) {
  const frames = new Map(elements.filter((el) => isDiagramFrame(el) && !el.isDeleted).map((el) => [el.id, el]))
  for (const el of elements) {
    if (!selected[el.id] || el.isDeleted) continue
    const frame = frames.get(el.id) ?? (el.frameId ? frames.get(el.frameId) : undefined)
    if (frame) return frame
  }
  return undefined
}

export function useDiagramEditor(api: ExcalidrawImperativeAPI | null, opts: { readOnly: boolean; elk?: ElkLike }) {
  const [active, setActiveState] = useState<Active>(null)
  const [errors, setErrors] = useState<DiagramError[]>([])
  // Refs so callbacks from Excalidraw and the panel always see the latest values.
  const activeRef = useRef<Active>(null)
  // Each redraw takes a ticket; a layout that finishes after a newer one is dropped.
  const ticket = useRef(0)
  // The type and code each frame holds from our own redraws. A frame holding anything else was changed by undo.
  const applied = useRef(new Map<string, string>())
  // Positions from the previous change event, and whether the drag notice was shown on this page.
  const prevPositions = useRef<Positions | null>(null)
  const noticeShown = useRef(false)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const setActive = (next: Active) => {
    activeRef.current = next
    setActiveState(next)
  }

  const show = (frame: ExcalidrawElement) => {
    const data = readDiagram(frame)
    if (!data) return
    applied.current.set(frame.id, stamp(data))
    setActive({ frameId: frame.id, data })
    setErrors(parseFlow(data.code).errors)
  }

  const open = (frameId: string) => {
    const frame = api?.getSceneElements().find((el) => el.id === frameId)
    if (frame) show(frame)
  }

  const close = () => setActive(null)

  const redraw = async (change: { code: string; diagramType?: DiagramType }) => {
    const current = activeRef.current
    if (optsRef.current.readOnly || !api || !current) return
    const mine = ++ticket.current
    const next = { ...current.data, ...change }
    setActive({ ...current, data: next })
    try {
      // A getter: the redraw applies to the scene as it is after the layout, keeping edits made meanwhile.
      const latest = () => api.getSceneElementsIncludingDeleted()
      const result = await updateDiagram(latest, current.frameId, change, optsRef.current.elk)
      if (mine !== ticket.current) return
      // Before updateScene: the change event it fires must not look like an undo.
      applied.current.set(current.frameId, stamp(next))
      api.updateScene({ elements: result.elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY })
      if (activeRef.current?.frameId === current.frameId) setErrors(result.errors)
    } catch (error) {
      console.error('Error drawing diagram:', error)
      toast.error('Could not draw the diagram')
    }
  }

  const setCode = (code: string) => void redraw({ code })

  const setType = (diagramType: DiagramType) => {
    const current = activeRef.current
    if (current) void redraw({ code: current.data.code, diagramType })
  }

  const insert = async () => {
    if (optsRef.current.readOnly || !api) return
    try {
      const code = STARTERS.flowchart
      const result = await createDiagram(
        { code, diagramType: 'flowchart', at: viewCentre(api.getAppState()) },
        optsRef.current.elk,
      )
      const frame = result.elements[result.elements.length - 1]
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...result.elements],
        // Selecting the new frame keeps the selection rule from switching back to another diagram.
        appState: { selectedElementIds: { [frame.id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
      api.setActiveTool({ type: 'selection' })
      show(frame)
      setErrors(result.errors)
    } catch (error) {
      console.error('Error inserting diagram:', error)
      toast.error('Could not add the diagram')
    }
  }

  const noticeDrag = () => {
    if (noticeShown.current) return
    noticeShown.current = true
    try {
      if (localStorage.getItem(NOTICE_KEY)) return
    } catch {
      // Storage blocked: the page-session flag above still limits it to one notice.
    }
    try {
      localStorage.setItem(NOTICE_KEY, '1')
    } catch {
      // Could not remember it (full or private mode): still show it.
    }
    toast('Shapes in this diagram are redrawn from its code')
  }

  // Runs on every Excalidraw change, our own updateScene calls included: keep it cheap.
  const onSceneChange = (elements: readonly ExcalidrawElement[], appState: Pick<AppState, 'selectedElementIds'>) => {
    if (!optsRef.current.readOnly) {
      const claimed = claimCopies(elements)
      if (claimed) {
        api?.updateScene({ elements: claimed, captureUpdate: CaptureUpdateAction.NEVER })
        return
      }
    }

    if (!optsRef.current.readOnly && !noticeShown.current) {
      if (prevPositions.current && movedDiagramChildren(prevPositions.current, elements)) noticeDrag()
      prevPositions.current = diagramPositions(elements)
    }

    const selected = Object.keys(appState.selectedElementIds).length > 0 && selectedDiagram(elements, appState.selectedElementIds)
    // Selecting nothing keeps the panel open: the user may be typing in it.
    if (selected && selected.id !== activeRef.current?.frameId) return show(selected)

    const current = activeRef.current
    if (!current) return
    const frame = elements.find((el) => el.id === current.frameId)
    if (!frame || frame.isDeleted) return close()
    const data = readDiagram(frame)
    if (data && stamp(data) !== applied.current.get(frame.id)) {
      ticket.current++ // a layout still running would undo the undo
      show(frame)
    }
  }

  return { active, errors, open, close, insert, setCode, setType, onSceneChange }
}
