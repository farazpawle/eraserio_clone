import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import type { DiagramSettings, PositionedSequence } from '../types'
import { CANVAS_TEXT, FONT, fillOf, styleFor } from './style'

const SHADOW_OFFSET = 6
const SELF_DROP = 18 // how far below the arrow's start a self message comes back
const LABEL_SIZE = 14 // the layout reserves 7px per character, which is about right at this size
const LABEL_LIFT = 22

// The skeleton union is too strict for objects built from spreads; each element is cast once.
const sk = (element: object) => element as ExcalidrawElementSkeleton

export function toSequenceSkeletons(
  positioned: PositionedSequence,
  settings: DiagramSettings,
  origin: { x: number; y: number },
  diagramId: string,
): ExcalidrawElementSkeleton[] {
  // Fresh objects per element: Excalidraw may mutate them.
  const tag = () => ({ customData: { diagramId }, groupIds: [diagramId] })
  const at = (x: number, y: number) => ({ x: x + origin.x, y: y + origin.y })
  const plain = styleFor({}, settings)
  const fontFamily = FONT[settings.typeface]
  const text = (value: string, x: number, y: number) =>
    sk({ type: 'text', text: value, ...at(x, y), fontSize: LABEL_SIZE, fontFamily, strokeColor: CANVAS_TEXT, ...tag() })
  const dashedLine = (id: string, x: number, y: number, dx: number, dy: number) =>
    sk({
      type: 'line',
      id,
      ...at(x, y),
      points: [
        [0, 0],
        [dx, dy],
      ],
      strokeColor: plain.strokeColor,
      strokeStyle: 'dashed',
      roughness: 0,
      ...tag(),
    })

  const out: ExcalidrawElementSkeleton[] = []

  // Frames first, outermost first (the layout lists parents before children), so they sit behind everything.
  positioned.blocks.forEach((b, i) => {
    const title = b.label ? `${b.type} [${b.label}]` : b.type
    out.push(
      sk({
        type: 'rectangle',
        id: `${diagramId}:k:${i}`,
        ...at(b.x, b.y),
        width: b.width,
        height: b.height,
        strokeColor: plain.strokeColor,
        backgroundColor: 'transparent',
        roughness: 0,
        label: { text: title, strokeColor: CANVAS_TEXT, fontFamily, ...tag(), verticalAlign: 'top', textAlign: 'left' },
        ...tag(),
      }),
    )
    b.dividers.forEach((d, k) => {
      out.push(dashedLine(`${diagramId}:d:${i}-${k}`, b.x, d.y, b.width, 0))
      if (d.label) out.push(text(`[${d.label}]`, b.x + 8, d.y + 6))
    })
  })

  for (const l of positioned.lifelines) out.push(dashedLine(`${diagramId}:l:${l.id}`, l.x, l.y1, 0, l.y2 - l.y1))

  const people = new Map(positioned.participants.map((p) => [p.id, p]))
  positioned.activations.forEach((a, i) => {
    out.push(
      sk({
        type: 'rectangle',
        id: `${diagramId}:a:${i}`,
        ...at(a.x, a.y1),
        width: 10,
        height: a.y2 - a.y1,
        ...fillOf(styleFor(people.get(a.participant) ?? {}, settings)),
        ...tag(),
      }),
    )
  })

  if (settings.styleMode === 'shadow')
    for (const p of positioned.participants)
      out.push(
        sk({
          type: 'rectangle',
          id: `${diagramId}:s:${p.id}`,
          ...at(p.x + SHADOW_OFFSET, p.y + SHADOW_OFFSET),
          width: p.width,
          height: p.height,
          strokeColor: 'transparent',
          backgroundColor: styleFor(p, settings).strokeColor,
          fillStyle: 'solid',
          roughness: 0,
          ...tag(),
        }),
      )
  for (const p of positioned.participants) {
    const style = styleFor(p, settings)
    out.push(
      sk({
        type: 'rectangle',
        id: `${diagramId}:p:${p.id}`,
        ...at(p.x, p.y),
        width: p.width,
        height: p.height,
        ...fillOf(style),
        label: { text: p.label, strokeColor: style.textColor, fontFamily, ...tag() },
        ...tag(),
      }),
    )
  }

  // Plain arrows along exact points. Lifelines are lines, which Excalidraw cannot bind arrows to; the labels
  // are separate texts above the arrow because a bound arrow label would sit on the line itself.
  positioned.messages.forEach((m, i) => {
    const self = m.from === m.to
    const dx = m.x2 - m.x1
    out.push(
      sk({
        type: 'arrow',
        id: `${diagramId}:m:${i}`,
        ...at(m.x1, m.y),
        points: self
          ? [
              [0, 0],
              [dx, 0],
              [dx, SELF_DROP],
              [0, SELF_DROP],
            ]
          : [
              [0, 0],
              [dx, 0],
            ],
        elbowed: false, // the 0.18.1 skeleton type has no `elbowed`; false keeps Excalidraw from re-routing (see render/flow.ts)
        roundness: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        strokeColor: plain.strokeColor,
        roughness: 0,
        ...(m.dashed ? { strokeStyle: 'dashed' } : {}),
        ...tag(),
      }),
    )
    if (!m.label) return
    out.push(
      self
        ? text(m.label, m.x2 + 10, m.y + SELF_DROP / 2 - LABEL_SIZE / 2)
        : text(m.label, Math.min(m.x1, m.x2) + 8, m.y - LABEL_LIFT),
    )
  })

  return out
}
