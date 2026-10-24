import '../diagram/excalidrawEnv'
import { act, renderHook, waitFor } from '@testing-library/react'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
import type { ElkNode } from 'elkjs/lib/elk-api'
import { toast } from 'sonner'
import { createDiagram } from '@/lib/diagram/block'
import { getElk, type ElkLike } from '@/lib/diagram/layout/elkWorker'
import { STARTERS } from '@/lib/diagram/templates'
import { diagramPositions, movedDiagramChildren, useDiagramEditor, viewCentre } from '@/app/(routes)/workspace/_components/diagram/useDiagramEditor'

jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }))

// Loose view of an element: the union type hides fields the tests read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = any

const APP_STATE = { scrollX: -100, scrollY: -50, zoom: { value: 2 }, width: 800, height: 600, selectedElementIds: {} }
const frameOf = (els: El[], id?: string) => els.find((e) => e.type === 'frame' && (!id || e.id === id))

function fakeApi(initial: El[] = []) {
  let scene = initial
  const api = {
    getSceneElements: jest.fn(() => scene.filter((e) => !e.isDeleted)),
    getSceneElementsIncludingDeleted: jest.fn(() => scene),
    getAppState: jest.fn(() => APP_STATE),
    updateScene: jest.fn(({ elements }: El) => {
      if (elements) scene = elements
    }),
    setActiveTool: jest.fn(),
  }
  return { api, scene: () => scene, setScene: (next: El[]) => (scene = next) }
}

// A layout whose calls finish only when the test says so; finish(i) waits for the result to land.
function slowElk() {
  const calls: { release(): void; result: Promise<unknown> }[] = []
  const elk: ElkLike = {
    layout: (graph: ElkNode) => {
      let release = () => {}
      const result = new Promise<void>((resolve) => (release = resolve)).then(() => getElk().layout(graph))
      calls.push({ release, result })
      return result
    },
  }
  const finish = (i: number) =>
    act(async () => {
      calls[i].release()
      await calls[i].result
      await new Promise((r) => setTimeout(r, 0))
    })
  return { elk, calls, finish }
}

async function sceneWithDiagram(code = 'A > B') {
  const { elements } = await createDiagram({ code, diagramType: 'flowchart', at: { x: 0, y: 0 } })
  const shape = { id: 'plain', type: 'rectangle', frameId: null, isDeleted: false, version: 1 }
  return [...(elements as El[]), shape]
}

function setup(scene: El[], opts: { readOnly?: boolean; elk?: ElkLike } = {}) {
  const fake = fakeApi(scene)
  const hook = renderHook(() => useDiagramEditor(fake.api as El, { readOnly: false, ...opts }))
  const select = (...ids: string[]) =>
    act(() =>
      hook.result.current.onSceneChange(fake.scene(), {
        ...APP_STATE,
        selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])),
      } as El),
    )
  return { ...fake, hook, select }
}

describe('viewCentre', () => {
  it('is the scene point in the middle of the view', () => {
    expect(viewCentre(APP_STATE)).toEqual({ x: 300, y: 200 })
  })
})

describe('useDiagramEditor', () => {
  it('opens a diagram when its frame or one of its shapes is selected, not for a plain shape', async () => {
    const scene = await sceneWithDiagram()
    const frame = frameOf(scene)
    const child = scene.find((e) => e.frameId === frame.id)
    const { hook, select } = setup(scene)

    select('plain')
    expect(hook.result.current.active).toBeNull()

    select(child.id)
    expect(hook.result.current.active).toEqual({ frameId: frame.id, data: frame.customData })

    act(() => hook.result.current.close())
    select(frame.id)
    expect(hook.result.current.active?.frameId).toBe(frame.id)
  })

  it('keeps the panel open when the selection is cleared', async () => {
    const scene = await sceneWithDiagram()
    const { hook, select } = setup(scene)
    select(frameOf(scene).id)

    select()

    expect(hook.result.current.active).not.toBeNull()
  })

  it('close() clears the active diagram', async () => {
    const scene = await sceneWithDiagram()
    const { hook } = setup(scene)
    act(() => hook.result.current.open(frameOf(scene).id))

    act(() => hook.result.current.close())

    expect(hook.result.current.active).toBeNull()
  })

  it('insert() adds the flowchart starter in the middle of the view and opens it', async () => {
    const { api, hook, scene } = setup([])

    await act(() => hook.result.current.insert())

    expect(api.updateScene).toHaveBeenCalledTimes(1)
    const frame = frameOf(scene())
    expect(frame.customData.code).toBe(STARTERS.flowchart)
    expect(frame.x + frame.width / 2).toBeCloseTo(300)
    expect(frame.y + frame.height / 2).toBeCloseTo(200)
    expect(api.updateScene.mock.calls[0][0].captureUpdate).toBe(CaptureUpdateAction.IMMEDIATELY)
    expect(api.updateScene.mock.calls[0][0].appState.selectedElementIds).toEqual({ [frame.id]: true })
    expect(api.setActiveTool).toHaveBeenCalledWith({ type: 'selection' })
    expect(hook.result.current.active?.frameId).toBe(frame.id)
  })

  it('setCode redraws with one undoable scene update and reports its errors', async () => {
    const scene = await sceneWithDiagram()
    const id = frameOf(scene).id
    const { api, hook } = setup(scene)
    act(() => hook.result.current.open(id))

    act(() => hook.result.current.setCode('A > B > C\nB >'))
    await waitFor(() => expect(api.updateScene).toHaveBeenCalled())

    expect(hook.result.current.active?.data.code).toBe('A > B > C\nB >')
    expect(api.updateScene).toHaveBeenCalledTimes(1)
    const [{ elements, captureUpdate }] = api.updateScene.mock.calls[0]
    expect(captureUpdate).toBe(CaptureUpdateAction.IMMEDIATELY)
    expect(frameOf(elements, id).customData.code).toBe('A > B > C\nB >')
    expect(hook.result.current.errors).toEqual([expect.objectContaining({ line: 2 })])
  })

  it('drops a slow layout that finishes after a newer one', async () => {
    const scene = await sceneWithDiagram()
    const id = frameOf(scene).id
    const { elk, calls, finish } = slowElk()
    const { api, hook } = setup(scene, { elk })
    act(() => hook.result.current.open(id))

    act(() => hook.result.current.setCode('First > One'))
    act(() => hook.result.current.setCode('Second > Two'))
    await act(async () => {})
    expect(calls).toHaveLength(2)

    await finish(1)
    await finish(0)

    expect(api.updateScene).toHaveBeenCalledTimes(1)
    expect(frameOf(api.updateScene.mock.calls[0][0].elements, id).customData.code).toBe('Second > Two')
    expect(hook.result.current.active?.data.code).toBe('Second > Two')
  })

  it('redraws onto the scene as it is when the layout finishes', async () => {
    const scene = await sceneWithDiagram()
    const id = frameOf(scene).id
    const { elk, finish } = slowElk()
    const { api, hook, setScene, scene: current } = setup(scene, { elk })
    act(() => hook.result.current.open(id))

    act(() => hook.result.current.setCode('A > B > C'))
    const drawn = { id: 'drawn-meanwhile', type: 'rectangle', frameId: null, isDeleted: false, version: 1 }
    setScene([...current(), drawn])
    await finish(0)

    expect(api.updateScene).toHaveBeenCalledTimes(1)
    expect(api.updateScene.mock.calls[0][0].elements).toContainEqual(drawn)
  })

  it('follows the frame when undo brings back another diagram type', async () => {
    const scene = await sceneWithDiagram()
    const frame = frameOf(scene)
    const { api, hook, select, scene: current } = setup(scene)
    select(frame.id)

    act(() => hook.result.current.setType('cloud'))
    await waitFor(() => expect(api.updateScene).toHaveBeenCalled())
    select(frame.id)
    expect(hook.result.current.active?.data.diagramType).toBe('cloud')

    const undone = current().map((e: El) => (e.id === frame.id ? frame : e))
    act(() => hook.result.current.onSceneChange(undone, APP_STATE as El))

    expect(hook.result.current.active?.data.diagramType).toBe('flowchart')
  })

  it('follows the frame when undo brings back other code, but not after its own redraw', async () => {
    const scene = await sceneWithDiagram('A > B')
    const frame = frameOf(scene)
    const { api, hook, select, scene: current } = setup(scene)
    select(frame.id)

    act(() => hook.result.current.setCode('A > C'))
    await waitFor(() => expect(api.updateScene).toHaveBeenCalled())
    select(frame.id) // the change event our own redraw causes
    expect(hook.result.current.active?.data.code).toBe('A > C')

    // Undo: the frame is back to its old code.
    const undone = current().map((e: El) => (e.id === frame.id ? frame : e))
    act(() => hook.result.current.onSceneChange(undone, APP_STATE as El))

    expect(hook.result.current.active?.data.code).toBe('A > B')
  })

  it('claims a pasted copy without an undo step, and does nothing when there is none', async () => {
    const scene = await sceneWithDiagram()
    const { api, select } = setup(scene)

    select()
    expect(api.updateScene).not.toHaveBeenCalled()

    const copy = { ...frameOf(scene), id: 'pasted-frame' }
    const pasted = setup([...scene, copy])
    pasted.select()

    expect(pasted.api.updateScene).toHaveBeenCalledTimes(1)
    const [{ elements, captureUpdate }] = pasted.api.updateScene.mock.calls[0]
    expect(captureUpdate).toBe(CaptureUpdateAction.NEVER)
    expect(frameOf(elements, 'pasted-frame').customData.diagramId).toBe('pasted-frame')
  })

  it('does not edit or insert when read-only', async () => {
    const scene = await sceneWithDiagram()
    const id = frameOf(scene).id
    const { api, hook } = setup(scene, { readOnly: true })
    act(() => hook.result.current.open(id))

    await act(async () => hook.result.current.setCode('X > Y'))
    await act(async () => hook.result.current.setType('cloud'))
    await act(() => hook.result.current.insert())
    await act(async () => {})

    expect(api.updateScene).not.toHaveBeenCalled()
    expect(hook.result.current.active?.data.code).toBe('A > B')
  })
})

describe('movedDiagramChildren', () => {
  const nudge = (els: El[], pick: (e: El) => boolean, dx = 10) => els.map((e) => (pick(e) ? { ...e, x: e.x + dx } : e))

  it('is true when one generated shape moves and its frame stays', async () => {
    const scene = await sceneWithDiagram()
    const child = scene.find((e) => e.frameId && e.type !== 'frame')
    expect(movedDiagramChildren(diagramPositions(scene), nudge(scene, (e) => e.id === child.id))).toBe(true)
  })

  it('is false when the whole frame moves with its shapes', async () => {
    const scene = await sceneWithDiagram()
    const frame = frameOf(scene)
    expect(movedDiagramChildren(diagramPositions(scene), nudge(scene, (e) => e.id === frame.id || e.frameId === frame.id))).toBe(false)
  })

  it('is false for our own redraw (new ids, old ones deleted)', async () => {
    const scene = await sceneWithDiagram()
    const frame = frameOf(scene)
    const redrawn = scene.map((e) => (e.frameId === frame.id ? { ...e, isDeleted: true } : e))
    const fresh = scene.filter((e) => e.frameId === frame.id).map((e) => ({ ...e, id: `new-${e.id}`, x: e.x + 40 }))
    expect(movedDiagramChildren(diagramPositions(scene), [...redrawn, ...fresh])).toBe(false)
  })

  it('ignores shapes the user drew inside the frame', async () => {
    const scene = await sceneWithDiagram()
    const frame = frameOf(scene)
    const own = { id: 'own', type: 'rectangle', x: 0, y: 0, frameId: frame.id, isDeleted: false }
    const before = [...scene, own]
    expect(movedDiagramChildren(diagramPositions(before), nudge(before, (e) => e.id === 'own'))).toBe(false)
  })
})

describe('drag notice', () => {
  const KEY = 'diagram-drag-notice-seen'
  const TEXT = 'Shapes in this diagram are redrawn from its code'
  const noticeCalls = () => (toast as unknown as jest.Mock).mock.calls.filter(([m]) => m === TEXT)

  beforeEach(() => {
    localStorage.clear()
    ;(toast as unknown as jest.Mock).mockClear()
  })
  afterEach(() => jest.restoreAllMocks())

  async function dragged(opts: { readOnly?: boolean } = {}) {
    const scene = await sceneWithDiagram()
    const child = scene.find((e) => e.frameId && e.type !== 'frame')
    const { hook } = setup(scene, opts)
    const moved = (dx: number) => scene.map((e) => (e.id === child.id ? { ...e, x: e.x + dx } : e))
    const feed = (els: El[]) => act(() => hook.result.current.onSceneChange(els, APP_STATE as El))
    feed(scene)
    return { feed, moved }
  }

  it('shows once and remembers it', async () => {
    const { feed, moved } = await dragged()
    feed(moved(5))
    feed(moved(9))
    expect(noticeCalls()).toHaveLength(1)
    expect(localStorage.getItem(KEY)).toBe('1')
  })

  it('stays quiet once it was seen before', async () => {
    localStorage.setItem(KEY, '1')
    const { feed, moved } = await dragged()
    feed(moved(5))
    expect(noticeCalls()).toHaveLength(0)
  })

  it('still shows once per page when storage throws', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { feed, moved } = await dragged()
    feed(moved(5))
    feed(moved(9))
    expect(noticeCalls()).toHaveLength(1)
  })

  it('still shows when only writing the flag throws', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { feed, moved } = await dragged()
    feed(moved(5))
    expect(noticeCalls()).toHaveLength(1)
  })

  it('fires when Excalidraw moves a shape in place and re-emits the same array', async () => {
    const scene = await sceneWithDiagram()
    const child = scene.find((e) => e.frameId && e.type !== 'frame')
    const { hook } = setup(scene)
    const feed = () => act(() => hook.result.current.onSceneChange(scene, APP_STATE as El))
    feed()
    child.x += 12 // mutate, same element object and same array
    feed()
    expect(noticeCalls()).toHaveLength(1)
  })

  it('stays quiet when read-only', async () => {
    const { feed, moved } = await dragged({ readOnly: true })
    feed(moved(5))
    expect(noticeCalls()).toHaveLength(0)
  })
})
