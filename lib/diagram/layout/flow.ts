import type { ElkNode } from 'elkjs/lib/elk-api'
import type { Box, DiagramSettings, FlowModel, FlowNode, PositionedFlow } from '../types'
import { getElk, type ElkLike } from './elkWorker'

const ROOT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.spacing.nodeNode': '40',
  'elk.layered.spacing.nodeNodeBetweenLayers': '60',
}
const GROUP_OPTIONS = { 'elk.padding': '[top=40,left=20,bottom=20,right=20]' }

export function estimateNodeSize(node: FlowNode): { width: number; height: number } {
  const textWidth = node.label.length * 8
  const lines = Math.ceil(textWidth / 208)
  return {
    width: Math.min(240, Math.max(120, textWidth + 32)),
    height: Math.max(56, lines * 20 + 24) + (node.icon ? 24 : 0),
  }
}

export async function layoutFlow(
  model: FlowModel,
  settings: DiagramSettings,
  elk: ElkLike = getElk(),
): Promise<PositionedFlow> {
  if (model.nodes.length === 0 && model.groups.length === 0)
    return { nodes: [], groups: [], edges: [], width: 0, height: 0 }

  const groupIds = new Set(model.groups.map((g) => g.id))
  const known = new Set([...model.groups, ...model.nodes].map((item) => item.id))
  const elkNodes = new Map<string, ElkNode>()
  for (const g of model.groups)
    elkNodes.set(g.id, { id: g.id, layoutOptions: GROUP_OPTIONS, children: [] })
  for (const n of model.nodes) elkNodes.set(n.id, { id: n.id, ...estimateNodeSize(n) })

  const root: ElkNode = {
    id: '__root__',
    layoutOptions: { ...ROOT_OPTIONS, 'elk.direction': settings.direction.toUpperCase() },
    children: [],
    edges: model.edges
      .filter((e) => known.has(e.from) && known.has(e.to))
      .map((e, i) => ({
        id: `e${i}`,
        sources: [e.from],
        targets: [e.to],
        labels: e.label ? [{ text: e.label, width: e.label.length * 7 + 8, height: 20 }] : [],
      })),
  }
  for (const item of [...model.groups, ...model.nodes]) {
    const parent = item.parent && groupIds.has(item.parent) ? elkNodes.get(item.parent)! : root
    parent.children!.push(elkNodes.get(item.id)!)
  }

  // ELK gives child positions relative to their parent; walk down adding offsets.
  const boxes = new Map<string, Box>()
  const place = (node: ElkNode, dx: number, dy: number) => {
    const x = dx + (node.x ?? 0)
    const y = dy + (node.y ?? 0)
    boxes.set(node.id, { x, y, width: node.width ?? 0, height: node.height ?? 0 })
    for (const child of node.children ?? []) place(child, x, y)
  }
  for (const child of (await elk.layout(root)).children ?? []) place(child, 0, 0)

  // Shift so the diagram's top-left is exactly 0,0.
  const all = Array.from(boxes.values())
  const minX = Math.min(...all.map((b) => b.x))
  const minY = Math.min(...all.map((b) => b.y))
  const at = (id: string): Box => {
    const b = boxes.get(id)!
    return { ...b, x: b.x - minX, y: b.y - minY }
  }
  const nodes = model.nodes.map((n) => ({ ...n, ...at(n.id) }))
  const groups = model.groups.map((g) => ({ ...g, ...at(g.id) }))
  const placed = [...nodes, ...groups]
  return {
    nodes,
    groups,
    edges: model.edges,
    width: Math.max(...placed.map((b) => b.x + b.width)),
    height: Math.max(...placed.map((b) => b.y + b.height)),
  }
}
