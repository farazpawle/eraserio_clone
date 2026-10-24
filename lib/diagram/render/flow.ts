import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import { type Box, type DiagramSettings, type EdgeKind, type PositionedFlow } from '../types'
import { outlinePoints } from './shapes'
import { CANVAS_TEXT, styleFor, type ElementStyle } from './style'

const SHADOW_OFFSET = 6
const ICON_FONT_SIZE = 12
const NATIVE = { rectangle: 'rectangle', diamond: 'diamond', ellipse: 'ellipse', oval: 'ellipse' } as const

const HEADS: Record<EdgeKind, { start: 'arrow' | null; end: 'arrow' | null }> = {
  arrow: { start: null, end: 'arrow' },
  both: { start: 'arrow', end: 'arrow' },
  line: { start: null, end: null }, // still an arrow element so it stays bound to both shapes
  dashed: { start: null, end: 'arrow' },
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
    // The icon tag sits at the top, so its label goes to the bottom: a centred two-line label ran into it.
    const nodeLabel = label(n.label, style, n.icon ? { verticalAlign: 'bottom' } : {})
    const native = NATIVE[n.shape as keyof typeof NATIVE]
    if (native) {
      out.push({ type: native, id, ...b, ...fillOf(style), label: nodeLabel, ...tag() })
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
        label: nodeLabel,
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
    if (!boxes.has(e.from) || !boxes.has(e.to) || e.points.length < 2) return
    // A plain arrow along ELK's route: Excalidraw's own elbow routing looped and crossed shapes.
    const [first] = e.points
    out.push({
      type: 'arrow',
      id: `${diagramId}:e:${i}`,
      x: first.x + origin.x,
      y: first.y + origin.y,
      points: e.points.map((p) => [p.x - first.x, p.y - first.y]),
      elbowed: false,
      roundness: null,
      start: { id: targets.get(e.from)! },
      end: { id: targets.get(e.to)! },
      startArrowhead: HEADS[e.kind].start,
      endArrowhead: HEADS[e.kind].end,
      strokeColor: edgeStyle.strokeColor,
      roughness: edgeStyle.roughness,
      ...(e.kind === 'dashed' ? { strokeStyle: 'dashed' as const } : {}),
      // Edge labels have no background: canvas text colour, never a fill's text colour.
      ...(e.label ? { label: label(e.label, { ...edgeStyle, textColor: CANVAS_TEXT }) } : {}),
      ...tag(),
      // `elbowed` is missing from the skeleton's arrow type in 0.18.1 but honoured by the converter.
    } as ExcalidrawElementSkeleton)
  })

  return out
}
