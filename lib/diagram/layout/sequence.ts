import type {
  DiagramSettings,
  PositionedSequence,
  SequenceItem,
  SequenceMessage,
  SequenceModel,
} from '../types'

export const HEADER_HEIGHT = 48
export const ACTIVATION_WIDTH = 10
const ACTIVATION_SHIFT = 5
const SELF_WIDTH = 40
const MESSAGE_ROW = 44
const ARROW_OFFSET = 32 // the label sits above the arrow, inside the row
const SELF_ROW = 52
const BLOCK_HEAD = 28
const BLOCK_END = 12
const DIVIDER_ROW = 28
const BLOCK_PAD = 16
const BOX_GAP = 40
const TOP_GAP = 24

const boxWidth = (label: string) => Math.min(200, Math.max(120, label.length * 8 + 32))
const labelWidth = (m: SequenceMessage) => (m.label ? m.label.length * 7 : 0)

function flatten(items: SequenceItem[]): SequenceMessage[] {
  return items.flatMap((i) =>
    i.kind === 'message' ? [i] : i.kind === 'block' ? i.branches.flatMap((b) => flatten(b.items)) : [],
  )
}

// `settings` is unused: sequence diagrams have no direction. Kept so every type shares one layout signature.
export function layoutSequence(model: SequenceModel, _settings: DiagramSettings): PositionedSequence {
  const people = model.participants
  if (people.length === 0) {
    return { participants: [], lifelines: [], messages: [], activations: [], blocks: [], width: 0, height: 0 }
  }
  const index = new Map(people.map((p, i) => [p.id, i]))
  const widths = people.map((p) => boxWidth(p.label))

  // Distance between neighbouring centres, widened until every message label fits in the span it crosses.
  // ponytail: a long span widens its gaps evenly; its label can still sit over a middle lifeline.
  const gaps = people.slice(1).map((_, i) => (widths[i] + widths[i + 1]) / 2 + BOX_GAP)
  const needs = flatten(model.items)
    .map((m) => {
      const [a, b] = [index.get(m.from)!, index.get(m.to)!].sort((x, y) => x - y)
      return a === b
        ? { lo: a, hi: a + 1, need: SELF_WIDTH + 10 + labelWidth(m) }
        : { lo: a, hi: b, need: labelWidth(m) + BOX_GAP }
    })
    .filter((n) => n.hi < people.length)
    .sort((x, y) => x.hi - x.lo - (y.hi - y.lo))
  for (const { lo, hi, need } of needs) {
    const have = gaps.slice(lo, hi).reduce((s, g) => s + g, 0)
    if (need > have) for (let g = lo; g < hi; g++) gaps[g] += (need - have) / (hi - lo)
  }
  const centres = [widths[0] / 2]
  gaps.forEach((g) => centres.push(centres[centres.length - 1] + g))
  const cx = (id: string) => centres[index.get(id)!]

  const messages: PositionedSequence['messages'] = []
  const activations: PositionedSequence['activations'] = []
  const blocks: PositionedSequence['blocks'] = []
  const open = new Map<string, number[]>() // participant -> indices into `activations`
  let cursor = HEADER_HEIGHT + TOP_GAP

  // Returns the x-range of what it drew, so a block can frame its contents.
  function walk(items: SequenceItem[], depth: number): [number, number] | null {
    let range: [number, number] | null = null
    const grow = (a: number, b: number) => {
      range = range ? [Math.min(range[0], a, b), Math.max(range[1], a, b)] : [Math.min(a, b), Math.max(a, b)]
    }
    for (const item of items) {
      if (item.kind === 'message') {
        const self = item.from === item.to
        const x1 = cx(item.from)
        const x2 = self ? x1 + SELF_WIDTH : cx(item.to)
        messages.push({ ...item, y: cursor + ARROW_OFFSET, x1, x2 })
        grow(x1, x2)
        cursor += self ? SELF_ROW : MESSAGE_ROW
      } else if (item.kind === 'activate') {
        const stack = open.get(item.who) ?? []
        const x = cx(item.who) - ACTIVATION_WIDTH / 2 + stack.length * ACTIVATION_SHIFT
        activations.push({ participant: item.who, x, y1: cursor, y2: -1 })
        stack.push(activations.length - 1)
        open.set(item.who, stack)
        grow(x, x + ACTIVATION_WIDTH)
      } else if (item.kind === 'deactivate') {
        const at = open.get(item.who)?.pop()
        if (at !== undefined) activations[at].y2 = cursor
      } else if (item.kind === 'block') {
        const frame: PositionedSequence['blocks'][number] = {
          type: item.type,
          label: item.branches[0].label,
          x: 0,
          y: cursor,
          width: 0,
          height: 0,
          depth,
          dividers: [],
        }
        blocks.push(frame) // before its children, so a parent is drawn behind them
        cursor += BLOCK_HEAD
        let inner: [number, number] | null = null
        item.branches.forEach((branch, k) => {
          if (k > 0) {
            frame.dividers.push({ y: cursor, label: branch.label })
            cursor += DIVIDER_ROW
          }
          const r = walk(branch.items, depth + 1)
          if (r) inner = inner ? [Math.min(inner[0], r[0]), Math.max(inner[1], r[1])] : r
        })
        cursor += BLOCK_END
        const [lo, hi] = inner ?? [centres[0], centres[centres.length - 1]]
        frame.x = lo - BLOCK_PAD
        frame.width = hi - lo + 2 * BLOCK_PAD
        frame.height = cursor - frame.y
        grow(frame.x, frame.x + frame.width)
      }
    }
    return range
  }
  walk(model.items, 0)

  const lifeEnd = cursor + TOP_GAP
  for (const a of activations) if (a.y2 < 0) a.y2 = lifeEnd

  // Everything left of the first box (a block frame, say) moves right so the drawing starts at x = 0.
  const boxes = people.map((p, i) => ({ ...p, x: centres[i] - widths[i] / 2, y: 0, width: widths[i], height: HEADER_HEIGHT }))
  const lefts = [...boxes.map((b) => b.x), ...blocks.map((b) => b.x)]
  const rights = [
    ...boxes.map((b) => b.x + b.width),
    ...blocks.map((b) => b.x + b.width),
    ...messages.filter((m) => m.from === m.to).map((m) => m.x2 + 10 + labelWidth(m)),
  ]
  const dx = -Math.min(...lefts)
  const moved = <T extends { x: number }>(o: T): T => ({ ...o, x: o.x + dx })

  return {
    participants: boxes.map(moved),
    lifelines: boxes.map((b, i) => ({ id: b.id, x: centres[i] + dx, y1: HEADER_HEIGHT, y2: lifeEnd })),
    messages: messages.map((m) => ({ ...m, x1: m.x1 + dx, x2: m.x2 + dx })),
    activations: activations.map(moved),
    blocks: blocks.map(moved),
    width: Math.max(...rights) + dx,
    height: lifeEnd,
  }
}
