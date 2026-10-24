import './excalidrawEnv'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
  claimCopies,
  createDiagram,
  isDiagramFrame,
  readDiagram,
  updateDiagram,
} from '@/lib/diagram/block'
import { STARTERS } from '@/lib/diagram/templates'
import { parseFlow } from '@/lib/diagram/parse/flow'
import { DEFAULT_SETTINGS } from '@/lib/diagram/types'

// Loose view of an element: the union type hides fields the tests read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = any

const CODE = 'A > B: go\nB > C [shape: hexagon]\nG {\nD\n}'
const frameOf = (els: readonly ExcalidrawElement[]) => els.find((e) => e.type === 'frame') as El
const childrenOf = (els: readonly ExcalidrawElement[], frameId: string) =>
  els.filter((e) => e.type !== 'frame' && e.frameId === frameId && !e.isDeleted) as El[]
const textsOf = (els: El[]) => els.filter((e) => e.type === 'text').map((e) => e.text).sort()

describe('createDiagram', () => {
  it('returns one tagged frame with every element inside it', async () => {
    const { elements, errors } = await createDiagram({
      code: CODE,
      diagramType: 'flowchart',
      at: { x: 500, y: 300 },
    })
    expect(errors).toEqual([])
    const frames = elements.filter((e) => e.type === 'frame')
    expect(frames).toHaveLength(1)
    const frame = frames[0] as El
    expect(isDiagramFrame(frame)).toBe(true)
    expect(readDiagram(frame)).toEqual({
      kind: 'diagram',
      version: 1,
      diagramId: frame.id,
      diagramType: 'flowchart',
      code: CODE,
      settings: DEFAULT_SETTINGS,
    })
    expect(frame.name).toBe('Diagram')
    expect(frame.x + frame.width / 2).toBeCloseTo(500)
    expect(frame.y + frame.height / 2).toBeCloseTo(300)

    const rest = elements.filter((e) => e !== frame) as El[]
    expect(rest.length).toBeGreaterThan(0)
    for (const el of rest) {
      expect(el.frameId).toBe(frame.id)
      expect(el.customData.diagramId).toBe(frame.id)
      expect(el.groupIds).toEqual([frame.id])
    }
    // Excalidraw keeps a frame's children right before the frame.
    expect(elements[elements.length - 1]).toBe(frame)
  })

  it('keeps what the converter promises: bound elbow arrows, tagged labels, filled outlines', async () => {
    const { elements } = await createDiagram({
      code: CODE,
      diagramType: 'flowchart',
      at: { x: 0, y: 0 },
    })
    const frame = frameOf(elements)
    const byId = new Map(elements.map((e) => [e.id, e as El]))
    const arrows = elements.filter((e) => e.type === 'arrow') as El[]
    expect(arrows).toHaveLength(2)
    for (const a of arrows) {
      expect(a.elbowed).toBe(true)
      expect(byId.get(a.startBinding.elementId).type).toBe('rectangle')
      expect(byId.get(a.endBinding.elementId).type).toBe('rectangle')
    }
    const labels = elements.filter((e) => e.type === 'text' && (e as El).containerId) as El[]
    // A, B, C, D, group G and the edge label "go"
    expect(textsOf(labels)).toEqual(['A', 'B', 'C', 'D', 'G', 'go'])
    for (const t of labels) {
      expect(t.frameId).toBe(frame.id)
      expect(t.customData.diagramId).toBe(frame.id)
      expect(t.groupIds).toEqual([frame.id])
    }
    const outline = elements.find((e) => e.type === 'line') as El
    expect(outline.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('names the frame after the title setting', async () => {
    const { elements } = await createDiagram({
      code: 'title Checkout\nA > B',
      diagramType: 'flowchart',
      at: { x: 0, y: 0 },
    })
    expect(frameOf(elements).name).toBe('Checkout')
  })

  it('draws the good lines of broken code and returns the errors', async () => {
    const { elements, errors } = await createDiagram({
      code: 'A > B\nA >\nC',
      diagramType: 'flowchart',
      at: { x: 0, y: 0 },
    })
    expect(errors.map((e) => e.line)).toEqual([2])
    expect(textsOf(elements as El[])).toEqual(['A', 'B', 'C'])
  })
})

describe('updateDiagram', () => {
  const scene = async () => {
    const one = await createDiagram({ code: 'A > B', diagramType: 'flowchart', at: { x: 0, y: 0 } })
    const two = await createDiagram({
      code: 'X > Y',
      diagramType: 'flowchart',
      at: { x: 2000, y: 0 },
    })
    const rect = { id: 'loose', type: 'rectangle', x: 0, y: 900, frameId: null } as El
    const all = [...one.elements, rect, ...two.elements] as ExcalidrawElement[]
    return { frame: frameOf(one.elements), two: two.elements, rect, all }
  }

  it('replaces only the target frame children and keeps everything else identical', async () => {
    const { frame, two, rect, all } = await scene()
    const oldChildren = childrenOf(all, frame.id)
    const { elements, errors } = await updateDiagram(all, frame.id, { code: 'A > B > C\nD' })
    expect(errors).toEqual([])

    for (const old of oldChildren) {
      const now = elements.find((e) => e.id === old.id) as El
      expect(now.isDeleted).toBe(true)
      expect(now.version).toBe(old.version + 1)
    }
    const fresh = childrenOf(elements, frame.id)
    expect(textsOf(fresh)).toEqual(['A', 'B', 'C', 'D'])
    for (const el of fresh) {
      expect(oldChildren.some((o) => o.id === el.id)).toBe(false)
      expect(el.customData.diagramId).toBe(frame.id)
      expect(el.groupIds).toEqual([frame.id])
    }
    for (const el of [rect, ...two]) expect(elements).toContain(el)

    const newFrame = elements.find((e) => e.id === frame.id) as El
    expect(newFrame.x).toBe(frame.x)
    expect(newFrame.y).toBe(frame.y)
    expect(newFrame.version).toBe(frame.version + 1)
    expect(readDiagram(newFrame)?.code).toBe('A > B > C\nD')
    expect(newFrame.width).toBeGreaterThan(frame.width)
    // 20px padding around the shapes.
    const shapes = fresh.filter((e) => e.type === 'rectangle')
    expect(Math.min(...shapes.map((e) => e.x))).toBeCloseTo(newFrame.x + 20)
    expect(Math.max(...shapes.map((e) => e.x + e.width))).toBeCloseTo(
      newFrame.x + newFrame.width - 20,
    )
    // New children sit right before their frame.
    const at = elements.indexOf(newFrame)
    expect(elements.slice(at - fresh.length, at)).toEqual(fresh)
  })

  it('never shrinks the frame below 200 x 120', async () => {
    const { frame, all } = await scene()
    const { elements } = await updateDiagram(all, frame.id, { code: '' })
    const newFrame = elements.find((e) => e.id === frame.id) as El
    expect([newFrame.width, newFrame.height]).toEqual([200, 120])
    expect(childrenOf(elements, frame.id)).toEqual([])
  })

  it('updates from the good lines and returns the errors', async () => {
    const { frame, all } = await scene()
    const { elements, errors } = await updateDiagram(all, frame.id, { code: 'A > B\nA >\nC' })
    expect(errors.map((e) => e.line)).toEqual([2])
    expect(textsOf(childrenOf(elements, frame.id))).toEqual(['A', 'B', 'C'])
    expect(readDiagram(elements.find((e) => e.id === frame.id)!)?.code).toBe('A > B\nA >\nC')
  })

  it('can switch the diagram type', async () => {
    const { frame, all } = await scene()
    const { elements } = await updateDiagram(all, frame.id, { code: 'A', diagramType: 'cloud' })
    expect(readDiagram(elements.find((e) => e.id === frame.id)!)?.diagramType).toBe('cloud')
  })
})

describe('claimCopies', () => {
  // What Excalidraw paste does: new ids, frameId and containers remapped, customData copied.
  const duplicate = (els: readonly ExcalidrawElement[]) => {
    const ids = new Map(els.map((e) => [e.id, `copy-${e.id}`]))
    return els.map((e: El) => ({
      ...e,
      id: ids.get(e.id),
      frameId: e.frameId ? ids.get(e.frameId) : null,
      containerId: e.containerId ? ids.get(e.containerId) : null,
      groupIds: ['pasted-group'],
    })) as ExcalidrawElement[]
  }

  it('gives a pasted diagram its own id and leaves the original alone', async () => {
    const { elements: original } = await createDiagram({
      code: CODE,
      diagramType: 'flowchart',
      at: { x: 0, y: 0 },
    })
    const copy = duplicate(original)
    const claimed = claimCopies([...original, ...copy])
    expect(claimed).not.toBeNull()
    for (const el of original) expect(claimed).toContain(el)

    const copyFrame = frameOf(copy)
    const newFrame = claimed!.find((e) => e.id === copyFrame.id)!
    expect(readDiagram(newFrame)?.diagramId).toBe(copyFrame.id)
    expect(readDiagram(newFrame)?.code).toBe(CODE)
    expect(newFrame.version).toBe(copyFrame.version + 1)
    const kids = childrenOf(claimed!, copyFrame.id)
    expect(kids).toHaveLength(original.length - 1)
    for (const el of kids) {
      expect(el.customData.diagramId).toBe(copyFrame.id)
      expect(el.groupIds).toEqual([copyFrame.id])
    }
    expect(claimCopies(claimed!)).toBeNull()
  })

  it('returns null for a scene without copies', async () => {
    const { elements } = await createDiagram({ code: 'A', diagramType: 'flowchart', at: { x: 0, y: 0 } })
    expect(claimCopies(elements)).toBeNull()
  })
})

describe('readDiagram', () => {
  it('rejects an unknown version and anything that is not a diagram frame', async () => {
    const { elements } = await createDiagram({ code: 'A', diagramType: 'flowchart', at: { x: 0, y: 0 } })
    const frame = frameOf(elements)
    expect(readDiagram({ ...frame, customData: { ...frame.customData, version: 2 } })).toBeNull()
    expect(readDiagram({ ...frame, type: 'rectangle' })).toBeNull()
    expect(readDiagram({ ...frame, customData: undefined })).toBeNull()
    expect(isDiagramFrame({ ...frame, customData: undefined })).toBe(false)
  })

  it('leaves a frame of an unknown version alone in claimCopies', async () => {
    const { elements } = await createDiagram({ code: 'A', diagramType: 'flowchart', at: { x: 0, y: 0 } })
    const frame = frameOf(elements)
    const future = { ...frame, customData: { ...frame.customData, version: 2, diagramId: 'x' } }
    expect(claimCopies([future])).toBeNull()
  })
})

describe('STARTERS', () => {
  it('parse without errors', () => {
    for (const code of Object.values(STARTERS)) expect(parseFlow(code).errors).toEqual([])
    expect(parseFlow(STARTERS.flowchart).model.nodes).toHaveLength(5)
    const cloud = parseFlow(STARTERS.cloud).model
    expect(cloud.groups).toHaveLength(1)
    expect(cloud.nodes).toHaveLength(4)
  })
})
