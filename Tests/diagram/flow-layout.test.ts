/** @jest-environment node */
import { estimateNodeSize, layoutFlow } from '@/lib/diagram/layout/flow'
import { parseFlow } from '@/lib/diagram/parse/flow'
import { DEFAULT_SETTINGS, type Box, type Direction } from '@/lib/diagram/types'
import { bigFlow } from './fixtures/bigFlow'

const model = (...lines: string[]) => parseFlow(lines.join('\n')).model
const layout = (lines: string[], direction: Direction = 'right') =>
  layoutFlow(model(...lines), { ...DEFAULT_SETTINGS, direction })
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

describe('estimateNodeSize', () => {
  it('clamps width between 120 and 240 and grows height with wrapped lines', () => {
    const node = { id: 'A', label: 'A', shape: 'rectangle' as const, line: 1 }
    expect(estimateNodeSize(node)).toEqual({ width: 120, height: 56 })
    expect(estimateNodeSize({ ...node, label: 'x'.repeat(20) })).toEqual({ width: 192, height: 56 })
    // 60 chars: 480px of text -> 3 lines -> 84 high; width capped at 240
    expect(estimateNodeSize({ ...node, label: 'x'.repeat(60) })).toEqual({ width: 240, height: 84 })
    expect(estimateNodeSize({ ...node, icon: 'aws-ec2' })).toEqual({ width: 120, height: 80 })
  })
})

describe('layoutFlow', () => {
  const code = [
    'Web [icon: aws-ec2]',
    'VPC {',
    'Subnet {',
    'API',
    'Worker',
    '}',
    'Queue',
    'Cache',
    '}',
    'Web > API, Worker',
    'API > Queue: jobs',
    'Worker > Cache',
  ]

  it('gives every node finite sizes and no two nodes in one group overlap', async () => {
    const flow = await layout(code)
    expect(flow.nodes.map((n) => n.id)).toEqual(['Web', 'API', 'Worker', 'Queue', 'Cache'])
    for (const n of flow.nodes) {
      for (const v of [n.x, n.y, n.width, n.height]) expect(Number.isFinite(v)).toBe(true)
      expect(n.width).toBeGreaterThan(0)
    }
    for (const a of flow.nodes)
      for (const b of flow.nodes)
        if (a !== b && a.parent === b.parent) expect(overlaps(a, b)).toBe(false)
    expect(flow.edges).toHaveLength(4)
  })

  it('puts each group box around its children in absolute coordinates, from 0,0', async () => {
    const flow = await layout(code)
    const groups = new Map(flow.groups.map((g) => [g.id, g]))
    const items = [...flow.nodes, ...flow.groups]
    let checked = 0
    for (const item of items) {
      if (!item.parent) continue
      expect(contains(groups.get(item.parent)!, item)).toBe(true)
      checked++
    }
    expect(checked).toBe(5) // API, Worker, Queue, Cache, Subnet
    expect(Math.min(...items.map((i) => i.x))).toBe(0)
    expect(Math.min(...items.map((i) => i.y))).toBe(0)
    expect(flow.width).toBe(Math.max(...items.map((i) => i.x + i.width)))
    expect(flow.height).toBe(Math.max(...items.map((i) => i.y + i.height)))
  })

  it.each<[Direction, (a: Box, b: Box) => boolean]>([
    ['right', (a, b) => b.x > a.x + a.width],
    ['down', (a, b) => b.y > a.y + a.height],
    ['left', (a, b) => a.x > b.x + b.width],
    ['up', (a, b) => a.y > b.y + b.height],
  ])('direction %s places B on that side of A', async (direction, isPlaced) => {
    const flow = await layout(['A > B'], direction)
    const [a, b] = flow.nodes
    expect(a.id).toBe('A')
    expect(isPlaced(a, b)).toBe(true)
  })

  it('returns an empty layout without calling ELK', async () => {
    const elk = { layout: jest.fn() }
    await expect(layoutFlow(model(''), DEFAULT_SETTINGS, elk)).resolves.toEqual({
      nodes: [],
      groups: [],
      edges: [],
      width: 0,
      height: 0,
    })
    expect(elk.layout).not.toHaveBeenCalled()
  })

  it('lays out an edge that points at a group', async () => {
    const flow = await layout(['Cluster {', 'A', 'B', '}', 'Client > Cluster', 'A > Cluster'])
    expect(flow.groups[0]).toMatchObject({ id: 'Cluster' })
    expect(flow.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'Client'])
  })

  it('gives an empty group a finite, non-zero box', async () => {
    const flow = await layout(['G {', '}'])
    const [g] = flow.groups
    expect(g.id).toBe('G')
    for (const v of [g.x, g.y, g.width, g.height]) expect(Number.isFinite(v)).toBe(true)
    expect(g.width).toBeGreaterThan(0)
    expect(g.height).toBeGreaterThan(0)
  })

  it('lays out 150 nodes in 10 groups in under 1500 ms', async () => {
    const big = model(bigFlow(150))
    expect(big.nodes).toHaveLength(150)
    expect(big.groups).toHaveLength(10)
    await layoutFlow(model('A > B'), DEFAULT_SETTINGS) // load ELK first
    // Main-thread CPU time: bundled ELK runs synchronously on this thread. Wall time
    // includes time stolen by parallel Jest workers, and process CPU time includes
    // V8's background GC and compiler threads; this counts only ELK's own work.
    // @types/node 20 lacks threadCpuUsage (Node 23.9+), hence the cast.
    const { threadCpuUsage } = process as NodeJS.Process & {
      threadCpuUsage(previous?: NodeJS.CpuUsage): NodeJS.CpuUsage
    }
    const start = threadCpuUsage()
    const flow = await layoutFlow(big, big.settings)
    const used = threadCpuUsage(start)
    const ms = (used.user + used.system) / 1000
    expect(flow.nodes).toHaveLength(150)
    expect(ms).toBeLessThan(1500)
  })
})
