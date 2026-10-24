/** @jest-environment node */
import { EXAMPLES } from '@/app/(routes)/help/diagram-syntax/examples'
import { parseFlow } from '@/lib/diagram/parse/flow'
import { parseDiagram } from '@/lib/diagram/parse'
import { parseSequence } from '@/lib/diagram/parse/sequence'
import { STARTERS } from '@/lib/diagram/templates'
import type { DiagramType } from '@/lib/diagram/types'

describe('syntax help examples', () => {
  it.each(EXAMPLES.map((e) => [e.title, e.code]))('parses without errors: %s', (title, code) => {
    const parse = title.startsWith('Sequence') ? parseSequence : parseFlow
    expect(parse(code).errors).toEqual([])
  })

  it('has the sequence examples', () => {
    const titles = EXAMPLES.map((e) => e.title)
    for (const t of ['Sequence: messages', 'Sequence: activation', 'Sequence: blocks']) expect(titles).toContain(t)
  })

  it.each(Object.entries(STARTERS))('starter %s parses without errors', (type, code) => {
    expect(parseDiagram(type as DiagramType, code).errors).toEqual([])
  })

  it('has examples', () => {
    expect(EXAMPLES.length).toBeGreaterThan(5)
  })
})
