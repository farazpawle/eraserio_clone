import {
  COLOR_NAMES,
  SHAPES,
  type ColorName,
  type EdgeKind,
  type FlowEdge,
  type FlowGroup,
  type FlowModel,
  type FlowNode,
  type ParseResult,
  type Shape,
} from '../types'
import { listOf, parseSettings } from './settings'

type Attrs = { label?: string; shape?: Shape; color?: ColorName; icon?: string }
// `name` is missing when the text is too broken to create anything;
// `error` alone (with a name) is a problem that still creates the item.
type Named = { name?: string; attrs: Attrs; error?: string }
type EdgeOp = { token: string; kind: EdgeKind; reversed: boolean; at: number }

const ATTR_KEYS = ['icon', 'color', 'shape', 'label']
const BAD_NAME = /[[\]{}<>:,"]/
// Longest first, so "-->" is not read as "-" and "<>" is not read as "<".
const OPERATORS: Omit<EdgeOp, 'at'>[] = [
  { token: '-->', kind: 'dashed', reversed: false },
  { token: '<>', kind: 'both', reversed: false },
  { token: '>', kind: 'arrow', reversed: false },
  { token: '<', kind: 'arrow', reversed: true },
]

// Marks the characters outside quotes and [ ] (the brackets themselves count as outside).
function outside(text: string): boolean[] {
  const top: boolean[] = []
  let quoted = false
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      quoted = !quoted
      top.push(false)
    } else if (quoted) {
      top.push(false)
    } else if (ch === '[') {
      top.push(depth === 0)
      depth++
    } else if (ch === ']' && depth > 0) {
      depth--
      top.push(depth === 0)
    } else {
      top.push(depth === 0)
    }
  }
  return top
}

function indexOutside(text: string, token: string): number {
  const top = outside(text)
  for (let i = 0; i < text.length; i++) if (top[i] && text.startsWith(token, i)) return i
  return -1
}

function splitOutside(text: string, sep: string): string[] {
  const top = outside(text)
  const parts: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (top[i] && text[i] === sep) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

function unquote(value: string): string {
  return /^".*"$/s.test(value) ? value.slice(1, -1) : value
}

function stripComment(line: string): string {
  const at = indexOutside(line, '//')
  return at === -1 ? line : line.slice(0, at)
}

function parseAttrs(body: string): { attrs: Attrs; error?: string } {
  const attrs: Attrs = {}
  let error: string | undefined
  const fail = (message: string) => (error ??= message)
  for (const part of splitOutside(body, ',').map((p) => p.trim())) {
    if (!part) continue
    const colon = part.indexOf(':')
    if (colon === -1) {
      fail(`Attribute "${part}" needs a value, like "color: blue".`)
      continue
    }
    const key = part.slice(0, colon).trim()
    const value = unquote(part.slice(colon + 1).trim())
    if (key === 'label' || key === 'icon') attrs[key] = value
    else if (key === 'shape') {
      if ((SHAPES as readonly string[]).includes(value)) attrs.shape = value as Shape
      else fail(`Unknown shape "${value}". Use ${listOf(SHAPES)}.`)
    } else if (key === 'color') {
      if ((COLOR_NAMES as readonly string[]).includes(value)) attrs.color = value as ColorName
      else fail(`Unknown color "${value}". Use ${listOf(COLOR_NAMES)}.`)
    } else fail(`Unknown attribute "${key}". Use ${listOf(ATTR_KEYS)}.`)
  }
  return { attrs, error }
}

// Reads `Name` or `Name [key: value, ...]`.
function parseNamed(text: string): Named {
  const trimmed = text.trim()
  const open = indexOutside(trimmed, '[')
  const name = (open === -1 ? trimmed : trimmed.slice(0, open)).trim()
  if (!name) return { attrs: {}, error: 'Missing a name before "[".' }
  if (BAD_NAME.test(name)) {
    return {
      attrs: {},
      error: `"${name}" is not a valid name. Names cannot contain [ ] { } < > : , or quotes.`,
    }
  }
  if (open === -1) return { name, attrs: {} }
  const end = trimmed.length - 1
  if (trimmed[end] !== ']' || !outside(trimmed)[end]) {
    return { attrs: {}, error: 'Missing "]" to close the attributes.' }
  }
  return { name, ...parseAttrs(trimmed.slice(open + 1, end)) }
}

function findOperators(text: string): EdgeOp[] {
  const top = outside(text)
  const ops: EdgeOp[] = []
  for (let i = 0; i < text.length; i++) {
    if (!top[i]) continue
    const op = OPERATORS.find((o) => text.startsWith(o.token, i))
    if (op) {
      ops.push({ ...op, at: i })
      i += op.token.length - 1
    } else if (text[i] === '-' && /\s/.test(text[i - 1] ?? '') && /\s/.test(text[i + 1] ?? '')) {
      // A lone "-" is a line only with spaces around it, so "api-gateway" stays a name.
      ops.push({ token: '-', kind: 'line', reversed: false, at: i })
    }
  }
  return ops
}

export function parseFlow(code: string): ParseResult<FlowModel> {
  const { settings, rest, errors } = parseSettings(code.split(/\r?\n/))
  const nodes = new Map<string, FlowNode>()
  const groups = new Map<string, FlowGroup>()
  const declared = new Set<string>()
  const edges: FlowEdge[] = []
  // An entry without an id is a broken group header; it still pairs with its "}".
  const stack: { id?: string; line: number }[] = []
  const failed = new Set<number>()

  const fail = (line: number, message: string) => {
    if (failed.has(line)) return
    failed.add(line)
    errors.push({ line, message })
  }
  const currentGroup = () => [...stack].reverse().find((g) => g.id)?.id
  const where = (parent?: string) => (parent ? `in group "${parent}"` : 'outside any group')

  function addNode(name: string, attrs: Attrs, line: number, declaring: boolean) {
    if (groups.has(name)) {
      if (declaring) fail(line, `"${name}" is already a group.`)
      return
    }
    const parent = currentGroup()
    let node = nodes.get(name)
    if (!node) {
      node = { id: name, label: name, shape: 'rectangle', parent, line }
      nodes.set(name, node)
    }
    if (declaring) {
      if (declared.has(name) && node.parent !== parent) {
        fail(line, `"${name}" is already ${where(node.parent)}.`)
        return
      }
      // A node first seen in an edge moves to where it is declared.
      node.parent = parent
      declared.add(name)
    }
    Object.assign(node, attrs)
  }

  function groupConflict(name: string): string | undefined {
    if (declared.has(name)) return `"${name}" is already a node.`
    const existing = groups.get(name)
    if (existing && existing.parent !== currentGroup()) {
      return `"${name}" is already ${where(existing.parent)}.`
    }
  }

  function openGroup(head: string, line: number) {
    const { name, attrs, error } = parseNamed(head)
    if (error) fail(line, error)
    const conflict = name && groupConflict(name)
    if (!name || conflict) {
      if (conflict) fail(line, conflict)
      stack.push({ line })
      return
    }
    nodes.delete(name) // a name first seen in an edge turns out to be this group
    const { shape, ...groupAttrs } = attrs
    if (shape) fail(line, 'Groups do not take a shape.')
    const group = groups.get(name) ?? { id: name, label: name, parent: currentGroup(), line }
    groups.set(name, Object.assign(group, groupAttrs))
    stack.push({ id: name, line })
  }

  function readEdgeLine(text: string, line: number): boolean {
    const colon = indexOutside(text, ':')
    const body = colon === -1 ? text : text.slice(0, colon)
    const ops = findOperators(body)
    if (ops.length === 0) return false
    const label = colon === -1 ? '' : unquote(text.slice(colon + 1).trim())
    const bounds = [0, ...ops.flatMap((o) => [o.at, o.at + o.token.length]), body.length]
    const sides: Named[][] = []
    for (let k = 0; k <= ops.length; k++) {
      const side = body.slice(bounds[2 * k], bounds[2 * k + 1])
      const named = splitOutside(side, ',').map((n) => (n.trim() ? parseNamed(n) : null))
      if (named.some((n) => n === null)) {
        const message = !side.trim()
          ? k === 0
            ? `Missing a name before "${ops[0].token}".`
            : `Missing a name after "${ops[k - 1].token}".`
          : 'Missing a name next to ",".'
        fail(line, message)
        return true
      }
      const broken = (named as Named[]).find((n) => !n.name)
      if (broken) {
        fail(line, broken.error ?? 'Missing a name.')
        return true
      }
      sides.push(named as Named[])
    }
    for (const n of sides.flat()) {
      if (n.error) fail(line, n.error)
      addNode(n.name!, n.attrs, line, false)
    }
    ops.forEach((op, k) => {
      for (const a of sides[k]) {
        for (const b of sides[k + 1]) {
          const [from, to] = op.reversed ? [b.name!, a.name!] : [a.name!, b.name!]
          const edge: FlowEdge = { from, to, kind: op.kind, line }
          if (label) edge.label = label
          edges.push(edge)
        }
      }
    })
    return true
  }

  rest.forEach((raw, i) => {
    const line = i + 1
    const text = stripComment(raw).trim()
    if (!text) return
    if (text === '}') {
      if (!stack.pop()) fail(line, 'Extra "}" with no group to close.')
      return
    }
    const brace = indexOutside(text, '{')
    if (brace === text.length - 1) return openGroup(text.slice(0, -1), line)
    if (brace !== -1) {
      const head = text.slice(0, brace)
      const name = parseNamed(head).name ?? head.trim()
      return fail(line, `Put the contents of "${name}" on new lines after "{".`)
    }
    if (readEdgeLine(text, line)) return
    const { name, attrs, error } = parseNamed(text)
    if (error) fail(line, error)
    if (name) addNode(name, attrs, line, true)
  })

  for (const open of stack) if (open.id) fail(open.line, `Group "${open.id}" is never closed.`)
  errors.sort((a, b) => a.line - b.line)

  return {
    model: { settings, nodes: Array.from(nodes.values()), groups: Array.from(groups.values()), edges },
    errors,
  }
}
