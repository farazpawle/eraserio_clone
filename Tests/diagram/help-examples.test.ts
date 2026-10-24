/** @jest-environment node */
import { EXAMPLES } from '@/app/(routes)/help/diagram-syntax/examples'
import { parseFlow } from '@/lib/diagram/parse/flow'
import { STARTERS } from '@/lib/diagram/templates'

describe('syntax help examples', () => {
  it.each(EXAMPLES.map((e) => [e.title, e.code]))('parses without errors: %s', (_title, code) => {
    expect(parseFlow(code).errors).toEqual([])
  })

  it.each(Object.entries(STARTERS))('starter %s parses without errors', (_type, code) => {
    expect(parseFlow(code).errors).toEqual([])
  })

  it('has examples', () => {
    expect(EXAMPLES.length).toBeGreaterThan(5)
  })
})
