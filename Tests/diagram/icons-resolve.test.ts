/** @jest-environment node */
import { createRegistry, type IconEntry } from '@/lib/diagram/icons/registry'
import { resolveIcons } from '@/lib/diagram/icons/resolve'
import { parseFlow } from '@/lib/diagram/parse/flow'

const entry = (id: string, aliases: string[] = []): IconEntry => ({
  id,
  provider: 'aws',
  label: id,
  keywords: [],
  aliases,
})
const registry = createRegistry({ version: 1, icons: [entry('aws-ec2', ['aws-compute']), entry('aws-vpc')] })
const model = (...lines: string[]) => parseFlow(lines.join('\n')).model

describe('resolveIcons', () => {
  it('rewrites an alias to the canonical id without an error', () => {
    const out = resolveIcons(model('Web [icon: aws-compute]'), registry)
    expect(out.model.nodes[0].icon).toBe('aws-ec2')
    expect(out.errors).toEqual([])
  })

  it('uses the generic icon and reports the line for an unknown node icon', () => {
    const out = resolveIcons(model('A', 'B', 'Web [icon: aws-nope]'), registry)
    expect(out.model.nodes.find((n) => n.id === 'Web')?.icon).toBe('generic')
    expect(out.errors).toHaveLength(1)
    expect(out.errors[0].line).toBe(3)
    expect(out.errors[0].message).toContain('aws-nope')
  })

  it('handles groups too', () => {
    const out = resolveIcons(model('VPC [icon: aws-vpc] {', 'Web [icon: aws-ec2]', '}', 'Bad [icon: x] {', '}'), registry)
    expect(out.model.groups.map((g) => g.icon)).toEqual(['aws-vpc', 'generic'])
    expect(out.errors.map((e) => e.line)).toEqual([4])
  })

  it('reports several unknown icons in line order', () => {
    const out = resolveIcons(model('A [icon: x]', 'B [icon: y]'), registry)
    expect(out.errors.map((e) => e.line)).toEqual([1, 2])
  })

  it('leaves the model alone without a registry', () => {
    const input = model('Web [icon: whatever]')
    const out = resolveIcons(input, null)
    expect(out.model).toEqual(input)
    expect(out.errors).toEqual([])
  })

  it('does not change its input', () => {
    const input = model('Web [icon: aws-nope]')
    const copy = JSON.parse(JSON.stringify(input))
    resolveIcons(input, registry)
    expect(input).toEqual(copy)
  })
})
