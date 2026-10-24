/** @jest-environment node */
import { layoutSequence } from '@/lib/diagram/layout/sequence'
import { parseSequence } from '@/lib/diagram/parse/sequence'
import { DEFAULT_SETTINGS } from '@/lib/diagram/types'

const layout = (...lines: string[]) => {
  const { model } = parseSequence(lines.join('\n'))
  return layoutSequence(model, model.settings)
}
const overlaps = (a: { x: number; width: number }, b: { x: number; width: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width

describe('layoutSequence', () => {
  it('puts boxes in a row, in order, without overlap', () => {
    const l = layout('C', 'A > B', 'B > C')
    expect(l.participants.map((p) => p.id)).toEqual(['C', 'A', 'B'])
    expect(new Set(l.participants.map((p) => p.y)).size).toBe(1)
    expect(new Set(l.participants.map((p) => p.height)).size).toBe(1)
    for (let i = 1; i < l.participants.length; i++) {
      expect(l.participants[i].x).toBeGreaterThanOrEqual(l.participants[i - 1].x + l.participants[i - 1].width)
    }
    expect(l.participants.every((p) => p.x >= 0)).toBe(true)
  })

  it('places message rows top to bottom between the lifeline centres', () => {
    const l = layout('A > B: one', 'B > A: two', 'A > A: self')
    const [m1, m2, m3] = l.messages
    expect(m1.y).toBeLessThan(m2.y)
    expect(m2.y).toBeLessThan(m3.y)
    const [a, b] = l.participants
    expect(m1.x1).toBe(a.x + a.width / 2)
    expect(m1.x2).toBe(b.x + b.width / 2)
    expect(m2.x2).toBeLessThan(m2.x1)
    expect(m3.x2).toBeGreaterThan(m3.x1)
  })

  it('stretches lifelines below the last message', () => {
    const l = layout('A > B', 'B > A')
    const last = Math.max(...l.messages.map((m) => m.y))
    for (const life of l.lifelines) {
      expect(life.y1).toBe(l.participants[0].y + l.participants[0].height)
      expect(life.y2).toBeGreaterThan(last)
    }
  })

  it('widens the gap for a wide label', () => {
    const gap = (l: ReturnType<typeof layout>) => l.messages[0].x2 - l.messages[0].x1
    const wide = layout(`A > B: ${'x'.repeat(90)}`)
    expect(gap(wide)).toBeGreaterThanOrEqual(90 * 7 + 40)
    expect(gap(layout('A > B: x'))).toBeLessThan(gap(wide))
  })

  it('draws activation bars, nested ones shifted, unclosed ones to the end', () => {
    const l = layout('activate B', 'A > B', 'activate B', 'B > A', 'deactivate B', 'deactivate B')
    expect(l.activations).toHaveLength(2)
    const [outer, inner] = l.activations
    expect(outer.y1).toBeLessThanOrEqual(l.messages[0].y)
    expect(outer.y2).toBeGreaterThanOrEqual(l.messages[1].y)
    expect(inner.x).toBeGreaterThan(outer.x)
    const open = layout('activate A', 'A > B')
    expect(open.activations[0].y2).toBe(open.lifelines[0].y2)
  })

  it('frames blocks around their rows, nested inside parents, with dividers', () => {
    const l = layout('A > B: before', 'alt [ok] {', 'loop {', 'A > B: in', '}', '} else [no] {', 'B > A: out', '}')
    const [alt, loop] = l.blocks
    const [before, inside, out] = l.messages
    expect(alt.type).toBe('alt')
    expect(loop.depth).toBe(1)
    expect(alt.y).toBeGreaterThan(before.y)
    expect(alt.y + alt.height).toBeGreaterThan(out.y)
    expect(loop.y).toBeGreaterThanOrEqual(alt.y)
    expect(loop.y + loop.height).toBeLessThanOrEqual(alt.y + alt.height)
    expect(loop.x).toBeGreaterThan(alt.x)
    expect(inside.y).toBeGreaterThan(loop.y)
    expect(alt.dividers).toHaveLength(1)
    expect(alt.dividers[0]).toMatchObject({ label: 'no' })
    expect(alt.dividers[0].y).toBeGreaterThan(inside.y)
    expect(alt.dividers[0].y).toBeLessThan(out.y)
    const [a, b] = l.participants
    expect(alt.x).toBeLessThan(a.x + a.width / 2)
    expect(alt.x + alt.width).toBeGreaterThan(b.x + b.width / 2)
  })

  it('gives a block with only an activation a height', () => {
    expect(layout('loop {', 'activate A', '}').blocks[0].height).toBeGreaterThan(0)
  })

  it('lays out 12 participants and 60 messages without overlap', () => {
    const names = Array.from({ length: 12 }, (_, i) => `P${i}`)
    const lines = Array.from({ length: 60 }, (_, i) => `${names[i % 12]} > ${names[(i * 5 + 3) % 12]}: message ${i}`)
    const l = layout(...lines)
    expect(l.participants).toHaveLength(12)
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) expect(overlaps(l.participants[i], l.participants[j])).toBe(false)
    expect(new Set(l.messages.map((m) => m.y)).size).toBe(l.messages.length)
    const last = Math.max(...l.messages.map((m) => m.y))
    expect(l.lifelines.every((x) => x.y2 >= last)).toBe(true)
    expect(l.height).toBeGreaterThanOrEqual(last)
    expect(l.width).toBeGreaterThanOrEqual(l.participants[11].x + l.participants[11].width)
  })

  it('returns an empty layout for an empty model', () => {
    expect(layout('')).toEqual({ participants: [], lifelines: [], messages: [], activations: [], blocks: [], width: 0, height: 0 })
    expect(layoutSequence({ settings: DEFAULT_SETTINGS, participants: [], items: [] }, DEFAULT_SETTINGS).width).toBe(0)
  })
})
