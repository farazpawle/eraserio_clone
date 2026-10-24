import { parseFlow } from '../parse/flow'

const OPERATOR = /<>|-->|>|<| - /

// The `[...]` of a line: the first one outside quotes.
function bracketSpan(text: string): { open: number; close: number } | null {
  let quoted = false
  let open = -1
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') quoted = !quoted
    else if (!quoted && c === '[' && open < 0) open = i
    else if (!quoted && c === ']' && open >= 0) return { open, close: i }
  }
  return null
}

// Attribute chunks of the text between the brackets, split at commas outside quotes.
function chunks(inner: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let quoted = false
  let start = 0
  for (let i = 0; i <= inner.length; i++) {
    if (inner[i] === '"') quoted = !quoted
    if (i === inner.length || (inner[i] === ',' && !quoted)) {
      out.push({ start, end: i })
      start = i + 1
    }
  }
  return out
}

// Puts `icon: <iconId>` on the node or group declared on `line` (1-based). Returns null for any
// other line (an edge, a setting, a comment, a blank line, out of range): the caller disables the picker.
export function setIconOnLine(code: string, line: number, iconId: string): string | null {
  const lines = code.split('\n')
  const model = parseFlow(code).model
  if (![...model.nodes, ...model.groups].some((item) => item.line === line)) return null

  const cr = lines[line - 1].endsWith('\r') ? '\r' : ''
  const text = lines[line - 1].slice(0, lines[line - 1].length - cr.length)
  const span = bracketSpan(text)
  const before = span ? text.slice(0, span.open) : text.replace(/\s*\{\s*$/, '')
  // A node declared by an edge shares the edge's line: there is no single node to give the icon to.
  if (OPERATOR.test(before)) return null

  let next: string
  if (!span) {
    const group = /\s*\{\s*$/.exec(text)
    next = group ? `${before} [icon: ${iconId}]${text.slice(before.length)}` : `${before} [icon: ${iconId}]`
  } else {
    const inner = text.slice(span.open + 1, span.close)
    const existing = chunks(inner).find((c) => /^\s*icon\s*:/.test(inner.slice(c.start, c.end)))
    let newInner: string
    if (existing) {
      const lead = /^\s*/.exec(inner.slice(existing.start, existing.end))![0]
      newInner = inner.slice(0, existing.start) + lead + `icon: ${iconId}` + inner.slice(existing.end)
    } else {
      newInner = inner.trim() === '' ? `icon: ${iconId}` : `${inner.trimEnd()}, icon: ${iconId}`
    }
    next = text.slice(0, span.open + 1) + newInner + text.slice(span.close)
  }
  lines[line - 1] = next + cr
  return lines.join('\n')
}
