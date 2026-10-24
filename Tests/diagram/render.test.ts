/** @jest-environment node */
import { toSkeletons } from '@/lib/diagram/render/flow'
import { outlinePoints } from '@/lib/diagram/render/shapes'
import { styleFor } from '@/lib/diagram/render/style'
import { layoutFlow } from '@/lib/diagram/layout/flow'
import { parseFlow } from '@/lib/diagram/parse/flow'
import {
  DEFAULT_SETTINGS,
  SHAPES,
  type DiagramSettings,
  type PositionedFlow,
  type Shape,
} from '@/lib/diagram/types'

const ID = 'dia1'
const ORIGIN = { x: 100, y: 200 }
// Loose view of a skeleton: the union type hides fields the tests read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sk = any

const node = (id: string, shape: Shape, x: number, extra = {}) => ({
  id,
  label: id,
  shape,
  line: 1,
  x,
  y: 10,
  width: 120,
  height: 56,
  ...extra,
})
const flow = (over: Partial<PositionedFlow> = {}): PositionedFlow => ({
  nodes: [node('A', 'rectangle', 0), node('B', 'rectangle', 200)],
  groups: [],
  edges: [{ from: 'A', to: 'B', kind: 'arrow', line: 1 }],
  width: 320,
  height: 76,
  ...over,
})
const make = (p: PositionedFlow, s: Partial<DiagramSettings> = {}) =>
  toSkeletons(p, { ...DEFAULT_SETTINGS, ...s }, ORIGIN, ID) as Sk[]
const byId = (sk: Sk[], id: string) => sk.find((e) => e.id === id)

describe('outlinePoints', () => {
  it.each(SHAPES.filter((s) => !['rectangle', 'diamond', 'ellipse', 'oval'].includes(s)))(
    '%s is closed and inside the box',
    (shape) => {
      const pts = outlinePoints(shape, 120, 56)
      expect(pts.length).toBeGreaterThan(3)
      expect(pts[0]).toEqual(pts[pts.length - 1])
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(120)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(56)
      }
    },
  )
  it('cylinder uses 8 points per curve', () => {
    // 8 (top edge) + 8 (bottom edge) + 1 closing point; the straight sides join the curves
    expect(outlinePoints('cylinder', 120, 56)).toHaveLength(17)
  })
})

describe('toSkeletons nodes', () => {
  it.each([
    ['rectangle', 'rectangle'],
    ['diamond', 'diamond'],
    ['ellipse', 'ellipse'],
    ['oval', 'ellipse'],
  ] as const)('%s becomes a native %s', (shape, type) => {
    const el = byId(make(flow({ nodes: [node('A', shape, 0)], edges: [] })), `${ID}:n:A`)
    expect(el.type).toBe(type)
    expect(el.label.text).toBe('A')
    expect(el.x).toBe(100)
    expect(el.y).toBe(210)
    expect(el.width).toBe(120)
  })

  it.each(['cylinder', 'document', 'hexagon', 'parallelogram', 'star', 'trapezoid', 'triangle'] as const)(
    '%s is a line outline plus a transparent labelled rectangle',
    (shape) => {
      const sk = make(flow({ nodes: [node('A', shape, 0)], edges: [] }))
      const outline = byId(sk, `${ID}:o:A`)
      const box = byId(sk, `${ID}:n:A`)
      expect(outline.type).toBe('line')
      expect(outline.points).toEqual(outlinePoints(shape, 120, 56))
      expect(outline.backgroundColor).toBe(styleFor({}, DEFAULT_SETTINGS).backgroundColor)
      expect(box.type).toBe('rectangle')
      expect(box.strokeColor).toBe('transparent')
      expect(box.backgroundColor).toBe('transparent')
      expect(box.label.text).toBe('A')
      expect([box.x, box.y, box.width, box.height]).toEqual([100, 210, 120, 56])
      expect(sk.indexOf(outline)).toBeLessThan(sk.indexOf(box))
    },
  )

  it('uses style colours, font and label colour', () => {
    const el = byId(
      make(flow({ nodes: [node('A', 'rectangle', 0, { color: 'blue' })], edges: [] })),
      `${ID}:n:A`,
    )
    const st = styleFor({ color: 'blue' }, DEFAULT_SETTINGS)
    expect(el.strokeColor).toBe(st.strokeColor)
    expect(el.backgroundColor).toBe(st.backgroundColor)
    expect(el.label.strokeColor).toBe(st.textColor)
    expect(el.label.fontFamily).toBe(st.fontFamily)
  })

  it('draws an icon tag inside the box above the label', () => {
    const sk = make(flow({ nodes: [node('A', 'rectangle', 0, { icon: 'aws-ec2', height: 80 })], edges: [] }))
    const icon = byId(sk, `${ID}:i:A`)
    expect(icon.type).toBe('text')
    expect(icon.text).toBe('[aws-ec2]')
    expect(icon.y).toBeGreaterThanOrEqual(210)
    expect(icon.y).toBeLessThan(210 + 80)
  })
})

describe('toSkeletons edges', () => {
  const edge = (kind: string, label?: string) =>
    byId(make(flow({ edges: [{ from: 'A', to: 'B', kind: kind as 'arrow', label, line: 1 }] })), `${ID}:e:0`)

  it('binds an elbow arrow to both node skeletons', () => {
    const e = edge('arrow')
    expect(e.type).toBe('arrow')
    expect(e.elbowed).toBe(true)
    expect(e.start.id).toBe(`${ID}:n:A`)
    expect(e.end.id).toBe(`${ID}:n:B`)
    expect(e.startArrowhead).toBeNull()
    expect(e.endArrowhead).toBe('arrow')
  })
  it('both has two heads, line none, dashed is dashed', () => {
    expect([edge('both').startArrowhead, edge('both').endArrowhead]).toEqual(['arrow', 'arrow'])
    expect([edge('line').startArrowhead, edge('line').endArrowhead]).toEqual([null, null])
    expect(edge('dashed').strokeStyle).toBe('dashed')
    expect(edge('dashed').endArrowhead).toBe('arrow')
  })
  it('keeps the edge label as plain text', () => {
    expect(edge('arrow', 'yes').label.text).toBe('yes')
  })
  it('binds to a group outline when the edge end is a group', () => {
    const g = { id: 'G', label: 'G', line: 1, x: 0, y: 0, width: 400, height: 200 }
    const sk = make(flow({ groups: [g], edges: [{ from: 'A', to: 'G', kind: 'arrow', line: 1 }] }))
    expect(byId(sk, `${ID}:e:0`).end.id).toBe(`${ID}:g:G`)
  })
})

describe('toSkeletons groups, shadows and tagging', () => {
  it('draws group outlines (outermost first) before nodes, label top-left', () => {
    const inner = { id: 'In', label: 'In', parent: 'Out', line: 1, x: 10, y: 30, width: 200, height: 100 }
    const outer = { id: 'Out', label: 'Out', line: 1, x: 0, y: 0, width: 300, height: 200 }
    const sk = make(flow({ groups: [inner, outer] }))
    const o = byId(sk, `${ID}:g:Out`)
    expect(o.type).toBe('rectangle')
    expect(o.label.text).toBe('Out')
    expect(o.label.verticalAlign).toBe('top')
    expect(o.label.textAlign).toBe('left')
    expect([o.x, o.y, o.width, o.height]).toEqual([100, 200, 300, 200])
    expect(sk.indexOf(o)).toBeLessThan(sk.indexOf(byId(sk, `${ID}:g:In`)))
    expect(sk.indexOf(byId(sk, `${ID}:g:In`))).toBeLessThan(sk.indexOf(byId(sk, `${ID}:n:A`)))
  })

  it('shadow mode adds an unbound backing per node, offset by 6,6', () => {
    const sk = make(flow(), { styleMode: 'shadow' })
    const s = byId(sk, `${ID}:s:A`)
    const n = byId(sk, `${ID}:n:A`)
    expect([s.x, s.y]).toEqual([n.x + 6, n.y + 6])
    expect(s.label).toBeUndefined()
    expect(s.strokeColor).toBe('transparent')
    expect(sk.indexOf(s)).toBeLessThan(sk.indexOf(n))
    expect(sk.some((e) => e.start?.id === s.id || e.end?.id === s.id)).toBe(false)
    expect(make(flow()).some((e) => String(e.id).includes(':s:'))).toBe(false)
  })

  it('tags every skeleton with the diagram id and one shared group', () => {
    const g = { id: 'G', label: 'G', line: 1, x: 0, y: 0, width: 400, height: 200 }
    const nodes = [node('A', 'cylinder', 0, { icon: 'x' }), node('B', 'rectangle', 200)]
    const sk = make(flow({ groups: [g], nodes }), { styleMode: 'shadow' })
    for (const e of sk) {
      expect(e.customData).toEqual({ diagramId: ID })
      expect(e.groupIds).toEqual([ID])
    }
  })

  it('passes hostile and huge labels through unchanged', () => {
    const evil = '<script>alert(1)</script>'
    const huge = 'x'.repeat(2000)
    const nodes = [node('A', 'rectangle', 0, { label: evil }), node('B', 'rectangle', 200, { label: huge })]
    const sk = make(flow({ nodes }))
    expect(byId(sk, `${ID}:n:A`).label.text).toBe(evil)
    expect(byId(sk, `${ID}:n:B`).label.text).toBe(huge)
  })

  it('works on a real parsed and laid out diagram', async () => {
    const { model } = parseFlow('Web [shape: cylinder] > API\nAPI > DB: query')
    const positioned = await layoutFlow(model, DEFAULT_SETTINGS)
    const sk = toSkeletons(positioned, DEFAULT_SETTINGS, { x: 0, y: 0 }, ID) as Sk[]
    expect(sk.filter((e) => e.type === 'arrow')).toHaveLength(2)
    expect(byId(sk, `${ID}:o:Web`)).toBeDefined()
  })
})
