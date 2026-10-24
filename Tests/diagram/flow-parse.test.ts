/** @jest-environment node */
import { parseFlow } from '@/lib/diagram/parse/flow'

const parse = (...lines: string[]) => parseFlow(lines.join('\n'))
const pairs = (code: string[]) =>
  parse(...code).model.edges.map((e) => `${e.from}${e.kind === 'arrow' ? '>' : e.kind}${e.to}`)

describe('parseFlow', () => {
  it('reads a node with attributes, keeping commas inside quotes', () => {
    const { model, errors } = parse('Web Server [shape: cylinder, color: blue, label: "Main, primary"]')
    expect(errors).toEqual([])
    expect(model.nodes).toEqual([
      { id: 'Web Server', label: 'Main, primary', shape: 'cylinder', color: 'blue', line: 1 },
    ])
  })

  it('uses the name as label and rectangle as shape by default', () => {
    expect(parse('Cache').model.nodes).toEqual([
      { id: 'Cache', label: 'Cache', shape: 'rectangle', line: 1 },
    ])
  })

  it('nests groups and puts nodes in the innermost group', () => {
    const { model, errors } = parse('VPC {', 'Subnet [color: green] {', 'API', '}', '}')
    expect(errors).toEqual([])
    expect(model.groups).toEqual([
      { id: 'VPC', label: 'VPC', line: 1 },
      { id: 'Subnet', label: 'Subnet', color: 'green', parent: 'VPC', line: 2 },
    ])
    expect(model.nodes[0]).toMatchObject({ id: 'API', parent: 'Subnet' })
  })

  it('reads all five edge kinds, storing A < B as B to A', () => {
    expect(pairs(['A > B', 'A < B', 'A <> B', 'A - B', 'A --> B'])).toEqual([
      'A>B',
      'B>A',
      'AbothB',
      'AlineB',
      'AdashedB',
    ])
  })

  it('keeps hyphens inside names', () => {
    const { model } = parse('api-gateway > db')
    expect(model.nodes.map((n) => n.id)).toEqual(['api-gateway', 'db'])
    expect(model.edges).toEqual([{ from: 'api-gateway', to: 'db', kind: 'arrow', line: 1 }])
  })

  it('labels every edge of a chain', () => {
    const { model } = parse('A > B > C: sends')
    expect(model.edges).toEqual([
      { from: 'A', to: 'B', kind: 'arrow', label: 'sends', line: 1 },
      { from: 'B', to: 'C', kind: 'arrow', label: 'sends', line: 1 },
    ])
  })

  it('fans out comma lists on either side', () => {
    expect(pairs(['A > B, C'])).toEqual(['A>B', 'A>C'])
    expect(pairs(['A, B > C'])).toEqual(['A>C', 'B>C'])
  })

  it('puts nodes created by an edge into the group the edge sits in', () => {
    const { model } = parse('G {', 'A > B', '}', 'C > A')
    expect(model.nodes).toEqual([
      { id: 'A', label: 'A', shape: 'rectangle', parent: 'G', line: 2 },
      { id: 'B', label: 'B', shape: 'rectangle', parent: 'G', line: 2 },
      { id: 'C', label: 'C', shape: 'rectangle', line: 4 },
    ])
  })

  it('merges a redeclared node and rejects it in a second group', () => {
    const { model, errors } = parse(
      'G1 {',
      'API [color: red]',
      'API [shape: hexagon]',
      '}',
      'G2 {',
      'API [color: blue]',
      '}',
    )
    expect(model.nodes).toEqual([
      { id: 'API', label: 'API', shape: 'hexagon', color: 'red', parent: 'G1', line: 2 },
    ])
    expect(errors).toEqual([{ line: 6, message: '"API" is already in group "G1".' }])
  })

  it('reports a missing } on the line that opened the group', () => {
    const { model, errors } = parse('VPC {', 'API', 'DB')
    expect(errors).toEqual([{ line: 1, message: 'Group "VPC" is never closed.' }])
    expect(model.nodes.map((n) => [n.id, n.parent])).toEqual([
      ['API', 'VPC'],
      ['DB', 'VPC'],
    ])
  })

  it('reports an extra }', () => {
    expect(parse('A', '}', 'B').errors).toEqual([
      { line: 2, message: 'Extra "}" with no group to close.' },
    ])
  })

  it('reports an unknown attribute but still creates the node', () => {
    const { model, errors } = parse('A [size: 3]')
    expect(errors).toEqual([
      { line: 1, message: 'Unknown attribute "size". Use icon, color, shape or label.' },
    ])
    expect(model.nodes).toHaveLength(1)
  })

  it('falls back to defaults for an unknown shape or color', () => {
    const { model, errors } = parse('A [shape: blob]', 'B [color: neon]')
    expect(errors.map((e) => e.line)).toEqual([1, 2])
    expect(errors[0].message).toMatch(/^Unknown shape "blob"\. Use rectangle, /)
    expect(errors[1].message).toMatch(/^Unknown color "neon"\. Use blue, /)
    expect(model.nodes).toEqual([
      { id: 'A', label: 'A', shape: 'rectangle', line: 1 },
      { id: 'B', label: 'B', shape: 'rectangle', line: 2 },
    ])
  })

  it('gives one error per bad line and parses the rest', () => {
    const { model, errors } = parse('A > B', 'A >', 'Group [color: ', 'C', 'B > C')
    expect(errors.map((e) => e.line)).toEqual([2, 3])
    expect(model.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C'])
    expect(model.groups).toEqual([])
    expect(pairs(['A > B', 'A >', 'Group [color: ', 'C', 'B > C'])).toEqual(['A>B', 'B>C'])
  })

  it('ignores comments and blank lines and consumes settings lines', () => {
    const { model, errors } = parse('direction down', '// a comment', '', 'A > B // trailing')
    expect(errors).toEqual([])
    expect(model.settings.direction).toBe('down')
    expect(model.nodes.map((n) => n.id)).toEqual(['A', 'B'])
  })

  it('rejects an inline group', () => {
    const { model, errors } = parse('G { A, B }')
    expect(errors).toEqual([
      { line: 1, message: 'Put the contents of "G" on new lines after "{".' },
    ])
    expect(model.groups).toEqual([])
    expect(model.nodes).toEqual([])
  })

  it('handles CRLF line endings', () => {
    const { model, errors } = parseFlow('G {\r\nA > B\r\n}')
    expect(errors).toEqual([])
    expect(model.groups.map((g) => g.id)).toEqual(['G'])
    expect(model.nodes.map((n) => n.id)).toEqual(['A', 'B'])
  })

  it('merges settings errors with its own, sorted by line', () => {
    expect(parse('A >', 'colorMode neon', 'B >').errors.map((e) => e.line)).toEqual([1, 2, 3])
  })
})
