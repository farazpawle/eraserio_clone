/** @jest-environment node */
import { parseSequence } from '@/lib/diagram/parse/sequence'

const parse = (...lines: string[]) => parseSequence(lines.join('\n'))
const ids = (...lines: string[]) => parse(...lines).model.participants.map((p) => p.id)

describe('parseSequence', () => {
  it('reads solid, dashed and unlabeled messages and creates participants', () => {
    const { model, errors } = parse('A > B: hi', 'B --> A: ok', 'A > B')
    expect(errors).toEqual([])
    expect(model.participants.map((p) => p.id)).toEqual(['A', 'B'])
    expect(model.items).toEqual([
      { kind: 'message', from: 'A', to: 'B', dashed: false, label: 'hi', line: 1 },
      { kind: 'message', from: 'B', to: 'A', dashed: true, label: 'ok', line: 2 },
      { kind: 'message', from: 'A', to: 'B', dashed: false, label: '', line: 3 },
    ])
  })

  it('orders participants by first appearance, declarations included', () => {
    expect(ids('C', 'A > B', 'B > C')).toEqual(['C', 'A', 'B'])
  })

  it('reads participant attributes; shape and icon are errors', () => {
    const ok = parse('Browser [label: "Web browser", color: blue]')
    expect(ok.errors).toEqual([])
    expect(ok.model.participants[0]).toMatchObject({ id: 'Browser', label: 'Web browser', color: 'blue' })
    for (const attr of ['shape: oval', 'icon: aws-ec2']) {
      const r = parse(`X [${attr}]`)
      expect(r.errors).toHaveLength(1)
      expect(r.errors[0].line).toBe(1)
      expect(r.model.participants).toHaveLength(1)
    }
  })

  it('reads activate and deactivate; a stray deactivate is an error, an unclosed activation is not', () => {
    const { model, errors } = parse('activate A', 'A > B', 'deactivate A')
    expect(errors).toEqual([])
    expect(model.items.map((i) => i.kind)).toEqual(['activate', 'message', 'deactivate'])
    expect(parse('A > B', 'deactivate A').errors).toEqual([{ line: 2, message: '"A" is not active.' }])
    expect(parse('activate A').errors).toEqual([])
  })

  it('reads blocks, branches and nesting', () => {
    const { model, errors } = parse(
      'alt [ok] {',
      'loop [every minute] {',
      'A > B',
      '}',
      '} else [failed] {',
      'B > A',
      '}',
      'par [x] {',
      'A > B',
      '} and {',
      'B > A',
      '}',
    )
    expect(errors).toEqual([])
    const [alt, par] = model.items as any[]
    expect(alt.type).toBe('alt')
    expect(alt.branches.map((b: any) => b.label)).toEqual(['ok', 'failed'])
    expect(alt.branches[0].items[0]).toMatchObject({ kind: 'block', type: 'loop' })
    expect(alt.branches[0].items[0].branches[0]).toMatchObject({ label: 'every minute' })
    expect(par.branches.map((b: any) => b.label)).toEqual(['x', ''])
  })

  it('reports broken blocks and still parses the rest', () => {
    const open = parse('loop {', 'A > B')
    expect(open.errors).toEqual([{ line: 1, message: 'Block "loop" is never closed.' }])
    expect(open.model.items).toHaveLength(1)
    expect(parse('A > B', '}').errors).toEqual([{ line: 2, message: 'Extra "}" with no block to close.' }])
    const misplaced = parse('loop {', '} else {', 'A > B', '}', 'B > A')
    expect(misplaced.errors).toHaveLength(1)
    expect(misplaced.errors[0].message).toContain('alt')
    expect(misplaced.model.items.some((i) => i.kind === 'message')).toBe(true)
  })

  it('reports bad message lines, one error each', () => {
    expect(parse('A >').errors).toHaveLength(1)
    expect(parse('> B').errors).toHaveLength(1)
    const chain = parse('A > B > C', 'B > C')
    expect(chain.errors).toHaveLength(1)
    expect(chain.errors[0].line).toBe(1)
    expect(chain.model.items).toHaveLength(1)
  })

  it('accepts names with spaces and rejects bad characters', () => {
    expect(parse('Order service > Payments: pay').errors).toEqual([])
    expect(parse('A{b > C').errors.length).toBeGreaterThan(0)
  })

  it('reads settings lines and ignores comments', () => {
    const { model, errors } = parse('title Login', 'direction down', '// note', 'A > B // trailing')
    expect(errors).toEqual([])
    expect(model.settings.title).toBe('Login')
    expect(model.items).toHaveLength(1)
    expect(parse('colorMode x', 'A > B').errors[0].line).toBe(1)
  })

  it('handles empty code', () => {
    expect(parse('')).toMatchObject({ model: { participants: [], items: [] }, errors: [] })
  })
})
