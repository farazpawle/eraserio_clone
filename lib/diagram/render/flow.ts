import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import { type Box, type DiagramSettings, type EdgeKind, type PositionedFlow } from '../types'
import { outlinePoints } from './shapes'
import { styleFor, type ElementStyle } from './style'

const SHADOW_OFFSET = 6
const ICON_FONT_SIZE = 12
const NATIVE = { rectangle: 'rectangle', diamond: 'diamond', ellipse: 'ellipse', oval: 'ellipse' } as const

const HEADS: Record<EdgeKind, { start: 'arrow' | null; end: 'arrow' | null }> = {
  arrow: { start: null, end: 'arrow' },
  both: { start: 'arrow', end: 'arrow' },
  line: { start: null, end: null }, // still an arrow element so it stays bound to both shapes
  dashed: { start: null, end: 'arrow' },
}

// Start of the arrow: centre of the side of `from` that faces `to`. Excalidraw re-routes elbow arrows after binding.
function facingPoint(from: Box, to: Box): { x: number; y: number } {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2)
  const dy = to.y + to.height / 2 - (from.y + from.height / 2)
  if (Math.abs(dx) >= Math.abs(dy))
    return { x: from.x + (dx >= 0 ? from.width : 0), y: from.y + from.height / 2 }
  return { x: from.x + from.width / 2, y: from.y + (dy >= 0 ? from.height : 0) }
}

export function toSkeletons(
  positioned: PositionedFlow,
  settings: DiagramSettings,
  origin: { x: number; y: number },
  diagramId: string,
): ExcalidrawElementSkeleton[] {
  // Fresh objects per element: Excalidraw may mutate them.
  const tag = () => ({ customData: { diagramId }, groupIds: [diagramId] })
  const shift = (b: Box): Box => ({
    x: b.x + origin.x,
    y: b.y + origin.y,
    width: b.width,
    height: b.height,
  })
  const out: ExcalidrawElementSkeleton[] = []
  const boxes = new Map<string, Box>() // shifted box by node/group id, for edge ends
  const targets = new Map<string, string>() // node/group id -> skeleton id arrows bind to

  const label = (text: string, style: ElementStyle, extra = {}) => ({
    text,
    strokeColor: style.textColor,
    fontFamily: style.fontFamily as 1,
    ...tag(),
    ...extra,
  })

  const fillOf = (style: ElementStyle) => ({
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    fillStyle: style.fillStyle,
    roughness: style.roughness,
    strokeWidth: style.strokeWidth,
  })

  // Outermost group first, so inner groups are drawn on top.
  const depth = (id: string | undefined): number => {
    const parent = positioned.groups.find((g) => g.id === id)?.parent
    return parent ? 1 + depth(parent) : 0
  }
  const groups = [...positioned.groups].sort((a, b) => depth(a.id) - depth(b.id))
  for (const g of groups) {
    const b = shift(g)
    const style = styleFor(g, settings, 'group')
    const id = `${diagramId}:g:${g.id}`
    boxes.set(g.id, b)
    targets.set(g.id, id)
    out.push({
      type: 'rectangle',
      id,
      ...b,
      ...fillOf(style),
      label: label(g.label, style, { verticalAlign: 'top', textAlign: 'left' }),
      ...tag(),
    })
  }

  const nodes = positioned.nodes.map((n) => ({ n, b: shift(n), style: styleFor(n, settings) }))

  // Backings first so they sit behind every node.
  if (settings.styleMode === 'shadow')
    for (const { n, b, style } of nodes) {
      const backing = {
        id: `${diagramId}:s:${n.id}`,
        x: b.x + SHADOW_OFFSET,
        y: b.y + SHADOW_OFFSET,
        width: b.width,
        height: b.height,
        strokeColor: 'transparent',
        backgroundColor: style.strokeColor,
        fillStyle: 'solid' as const,
        roughness: 0 as const,
        ...tag(),
      }
      const native = NATIVE[n.shape as keyof typeof NATIVE]
      out.push(
        native
          ? { type: native, ...backing }
          : { type: 'line', ...backing, points: outlinePoints(n.shape, b.width, b.height) },
      )
    }

  for (const { n, b, style } of nodes) {
    const id = `${diagramId}:n:${n.id}`
    boxes.set(n.id, b)
    targets.set(n.id, id)
    const native = NATIVE[n.shape as keyof typeof NATIVE]
    if (native) {
      out.push({ type: native, id, ...b, ...fillOf(style), label: label(n.label, style), ...tag() })
    } else {
      out.push({
        type: 'line',
        id: `${diagramId}:o:${n.id}`,
        ...b,
        ...fillOf(style),
        points: outlinePoints(n.shape, b.width, b.height),
        ...tag(),
      })
      out.push({
        type: 'rectangle',
        id,
        ...b,
        strokeColor: 'transparent',
        backgroundColor: 'transparent',
        label: label(n.label, style),
        ...tag(),
      })
    }
    if (n.icon) {
      const text = `[${n.icon}]`
      out.push({
        type: 'text',
        id: `${diagramId}:i:${n.id}`,
        text,
        // Rough centring: the real text width is only known after Excalidraw measures it.
        x: b.x + b.width / 2 - text.length * ICON_FONT_SIZE * 0.3,
        y: b.y + 6,
        fontSize: ICON_FONT_SIZE,
        fontFamily: style.fontFamily as 1,
        strokeColor: style.textColor,
        ...tag(),
      })
    }
  }

  const edgeStyle = styleFor({}, settings)
  positioned.edges.forEach((e, i) => {
    const from = boxes.get(e.from)
    const to = boxes.get(e.to)
    if (!from || !to) return
    const start = facingPoint(from, to)
    const end = facingPoint(to, from)
    out.push({
      type: 'arrow',
      id: `${diagramId}:e:${i}`,
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      elbowed: true,
      start: { id: targets.get(e.from)! },
      end: { id: targets.get(e.to)! },
      startArrowhead: HEADS[e.kind].start,
      endArrowhead: HEADS[e.kind].end,
      strokeColor: edgeStyle.strokeColor,
      roughness: edgeStyle.roughness,
      ...(e.kind === 'dashed' ? { strokeStyle: 'dashed' as const } : {}),
      ...(e.label ? { label: label(e.label, edgeStyle) } : {}),
      ...tag(),
      // `elbowed` is missing from the skeleton's arrow type in 0.18.1 but honoured by the converter.
    } as ExcalidrawElementSkeleton)
  })

  return out
}
