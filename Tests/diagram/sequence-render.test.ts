/** @jest-environment node */
import { layoutSequence } from '@/lib/diagram/layout/sequence'
import { parseSequence } from '@/lib/diagram/parse/sequence'
import { toSequenceSkeletons } from '@/lib/diagram/render/sequence'
import { CANVAS_TEXT, styleFor } from '@/lib/diagram/render/style'
import { DEFAULT_SETTINGS, type DiagramSettings } from '@/lib/diagram/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sk = any
const ID = 'dia1'
const ORIGIN = { x: 100, y: 200 }

const draw = (code: string, over: Partial<DiagramSettings> = {}): Sk[] => {
  const { model } = parseSequence(code)
  const settings = { ...model.settings, ...over }
  return toSequenceSkeletons(layoutSequence(model, settings), settings, ORIGIN, ID)
}
const arrows = (sk: Sk[]) => sk.filter((e) => e.type === 'arrow')

describe('toSequenceSkeletons', () => {
  it('tags every element with the diagram id and gives unique ids', () => {
    const sk = draw('A > B: hi\nloop [x] {\nB --> A: ok\n}\nactivate B')
    for (const e of sk) {
      expect(e.customData).toEqual({ diagramId: ID })
      expect(e.groupIds).toEqual([ID])
    }
    const ids = sk.map((e) => e.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('draws a labelled box and a dashed lifeline per participant', () => {
    const sk = draw('Browser [label: "Web browser", color: red]\nBrowser > API')
    const box = sk.find((e) => e.id === `${ID}:p:Browser`)
    expect(box.type).toBe('rectangle')
    expect(box.label.text).toBe('Web browser')
    expect(box.strokeColor).toBe(styleFor({ color: 'red' }, DEFAULT_SETTINGS).strokeColor)
    const lifelines = sk.filter((e) => e.type === 'line' && e.id.includes(':l:'))
    expect(lifelines).toHaveLength(2)
    expect(lifelines.every((l) => l.strokeStyle === 'dashed')).toBe(true)
  })

  it('draws solid and dashed arrows with geometry from the layout', () => {
    const sk = draw('A > B: hi\nB --> A: ok')
    const [solid, dashed] = arrows(sk)
    expect(solid.strokeStyle).toBeUndefined()
    expect(solid.endArrowhead).toBe('arrow')
    expect(dashed.strokeStyle).toBe('dashed')
    expect(solid).toMatchObject({ elbowed: false, roundness: null })
    expect(solid.x).toBeGreaterThan(ORIGIN.x)
    expect(solid.y).toBeGreaterThan(ORIGIN.y)
    expect(solid.points[0]).toEqual([0, 0])
    expect(solid.points[1][0]).toBeGreaterThan(0)
    expect(dashed.points[1][0]).toBeLessThan(0)
  })

  it('puts the message label above the arrow in canvas text colour; none when unlabeled', () => {
    const sk = draw('A > B: hello\nA > B')
    const texts = sk.filter((e) => e.type === 'text')
    expect(texts).toHaveLength(1)
    expect(texts[0]).toMatchObject({ text: 'hello', strokeColor: CANVAS_TEXT })
    expect(texts[0].y).toBeLessThan(arrows(sk)[0].y)
  })

  it('draws a self message as a loop back to the lifeline', () => {
    const [self] = arrows(draw('A > A: think'))
    expect(self.points.length).toBeGreaterThanOrEqual(3)
    const last = self.points[self.points.length - 1]
    expect(last[0]).toBe(0)
    expect(last[1]).toBeGreaterThan(0)
  })

  it('draws activation bars as narrow rectangles', () => {
    const sk = draw('activate B\nA > B\ndeactivate B')
    const bar = sk.find((e) => e.id?.startsWith(`${ID}:a:`))
    expect(bar.type).toBe('rectangle')
    expect(bar.width).toBe(10)
    expect(bar.height).toBeGreaterThan(0)
  })

  it('draws block frames behind everything, with dividers', () => {
    const sk = draw('A > B\nalt [ok] {\nA > B\n} else [no] {\nB > A\n}')
    const frame = sk.find((e) => e.id?.startsWith(`${ID}:k:`))
    expect(frame.type).toBe('rectangle')
    expect(frame.backgroundColor).toBe('transparent')
    expect(frame.label.text).toBe('alt [ok]')
    const divider = sk.find((e) => e.id?.startsWith(`${ID}:d:`))
    expect(divider.type).toBe('line')
    expect(divider.strokeStyle).toBe('dashed')
    expect(sk.some((e) => e.type === 'text' && e.text === '[no]')).toBe(true)
    const at = (e: Sk) => sk.indexOf(e)
    expect(at(frame)).toBeLessThan(at(sk.find((e) => e.id?.includes(':l:'))))
    expect(at(frame)).toBeLessThan(at(arrows(sk)[0]))
  })

  it('adds shadow backings for shadow style and hachure fills for watercolor', () => {
    const shadow = draw('A > B', { styleMode: 'shadow' })
    const backings = shadow.filter((e) => e.id?.startsWith(`${ID}:s:`))
    expect(backings).toHaveLength(2)
    expect(shadow.indexOf(backings[0])).toBeLessThan(shadow.findIndex((e) => e.id === `${ID}:p:A`))
    expect(draw('A > B', { styleMode: 'watercolor' }).find((e) => e.id === `${ID}:p:A`).fillStyle).toBe('hachure')
  })

  it('draws nothing for empty code', () => {
    expect(draw('')).toEqual([])
  })
})
