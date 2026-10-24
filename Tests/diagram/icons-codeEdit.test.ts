/** @jest-environment node */
import { setIconOnLine } from '@/lib/diagram/icons/codeEdit'
import { parseFlow } from '@/lib/diagram/parse/flow'

const set = (code: string, line: number, id = 'aws-ec2') => setIconOnLine(code, line, id)

describe('setIconOnLine', () => {
  it.each([
    ['Web', 'Web [icon: aws-ec2]'],
    ['Web [color: blue]', 'Web [color: blue, icon: aws-ec2]'],
    ['Web [icon: azure-vm, color: blue]', 'Web [icon: aws-ec2, color: blue]'],
    ['Web [color: blue, icon: azure-vm]', 'Web [color: blue, icon: aws-ec2]'],
    ['Web [label: "a, b]"]', 'Web [label: "a, b]", icon: aws-ec2]'],
    ['Web [label: "icon: x"]', 'Web [label: "icon: x", icon: aws-ec2]'],
    ['Web []', 'Web [icon: aws-ec2]'],
    ['VPC {', 'VPC [icon: aws-ec2] {'],
    ['VPC [color: red] {', 'VPC [color: red, icon: aws-ec2] {'],
    ['VPC [icon: x] {', 'VPC [icon: aws-ec2] {'],
  ])('%s -> %s', (before, after) => {
    const code = `${before}\n${before.endsWith('{') ? '}' : 'Other'}`
    expect(set(code, 1)).toBe(`${after}\n${before.endsWith('{') ? '}' : 'Other'}`)
  })

  it('only touches the chosen line and keeps Windows line endings', () => {
    expect(set('A\r\nB\r\nC', 2)).toBe('A\r\nB [icon: aws-ec2]\r\nC')
  })

  it('returns null for edge lines, blank lines, settings and lines out of range', () => {
    const code = 'direction down\nA\nB\nA > B\n\n// note\nA --> B: go'
    for (const line of [1, 4, 5, 6, 7, 0, 99]) expect(set(code, line)).toBeNull()
  })

  it('gives code that parses with the icon on that node and no new errors', () => {
    const code = 'title T\nVPC {\nWeb [color: blue]\n}\nWeb > DB'
    const out = set(code, 3, 'aws-ec2')!
    const { model, errors } = parseFlow(out)
    expect(errors).toEqual(parseFlow(code).errors)
    expect(model.nodes.find((n) => n.id === 'Web')?.icon).toBe('aws-ec2')
  })
})
