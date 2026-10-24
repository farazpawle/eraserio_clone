import type {
  ParseResult,
  SequenceBlock,
  SequenceBlockType,
  SequenceItem,
  SequenceModel,
  SequenceParticipant,
} from '../types'
import { indexOutside, parseNamed, stripComment, unquote } from './flow'
import { parseSettings } from './settings'

const OPENER = /^(loop|alt|opt|par)\s*(?:\[(.*)\])?\s*\{$/
const BRANCH = /^\}\s*(else|and)\s*(?:\[(.*)\])?\s*\{$/
const ACTIVATION = /^(activate|deactivate)\s+(.+)$/
const BRANCH_OWNER: Record<string, SequenceBlockType> = { else: 'alt', and: 'par' }

type Open = { block?: SequenceBlock; items: SequenceItem[]; line: number }

export function parseSequence(code: string): ParseResult<SequenceModel> {
  const { settings, rest, errors } = parseSettings(code.split(/\r?\n/))
  const participants = new Map<string, SequenceParticipant>()
  const active = new Map<string, number>()
  const root: SequenceItem[] = []
  // A broken `} else {` outside any block opens an entry without a block; its items flow to the parent on close.
  const stack: Open[] = []
  const failed = new Set<number>()

  const fail = (line: number, message: string) => {
    if (failed.has(line)) return
    failed.add(line)
    errors.push({ line, message })
  }
  const items = () => (stack.length ? stack[stack.length - 1].items : root)

  function ensure(named: ReturnType<typeof parseNamed>, line: number): string | undefined {
    if (named.error) fail(line, named.error)
    const name = named.name
    if (!name) return undefined
    let p = participants.get(name)
    if (!p) {
      p = { id: name, label: name, line }
      participants.set(name, p)
    }
    const { shape, icon, label, color } = named.attrs
    if (shape || icon) fail(line, 'Sequence participants take only "label" and "color".')
    if (label !== undefined) p.label = label
    if (color) p.color = color
    return name
  }

  function close(line: number) {
    const top = stack.pop()
    if (!top) return fail(line, 'Extra "}" with no block to close.')
    if (top.block) items().push(top.block)
    else items().push(...top.items)
  }

  function open(type: SequenceBlockType, label: string, line: number) {
    const block: SequenceBlock = { kind: 'block', type, branches: [], line }
    const entry: Open = { block, items: [], line }
    block.branches.push({ label, items: entry.items })
    stack.push(entry)
  }

  function branch(word: string, label: string, line: number) {
    const top = stack[stack.length - 1]
    if (!top?.block) {
      fail(line, `"${word}" belongs inside a ${BRANCH_OWNER[word]} block.`)
      stack.push({ items: [], line })
      return
    }
    if (top.block.type !== BRANCH_OWNER[word]) {
      fail(line, `"${word}" belongs inside a ${BRANCH_OWNER[word]} block, not ${top.block.type}.`)
    }
    top.items = []
    top.block.branches.push({ label, items: top.items })
  }

  function message(body: string, labelText: string, line: number): boolean {
    const dashed = indexOutside(body, '-->')
    const at = dashed !== -1 ? dashed : indexOutside(body, '>')
    if (at === -1) return false
    const token = dashed !== -1 ? '-->' : '>'
    const left = body.slice(0, at)
    const right = body.slice(at + token.length)
    if (!left.trim()) fail(line, `Missing a name before "${token}".`)
    else if (!right.trim()) fail(line, `Missing a name after "${token}".`)
    else if (indexOutside(right, '>') !== -1) fail(line, 'Use one arrow per line.')
    else {
      const from = ensure(parseNamed(left), line)
      const to = ensure(parseNamed(right), line)
      if (from && to) {
        items().push({ kind: 'message', from, to, dashed: dashed !== -1, label: labelText, line })
      }
    }
    return true
  }

  rest.forEach((raw, i) => {
    const line = i + 1
    const text = stripComment(raw).trim()
    if (!text) return
    if (text === '}') return close(line)
    const branchMatch = BRANCH.exec(text)
    if (branchMatch) return branch(branchMatch[1], (branchMatch[2] ?? '').trim(), line)
    const openMatch = OPENER.exec(text)
    if (openMatch) return open(openMatch[1] as SequenceBlockType, (openMatch[2] ?? '').trim(), line)
    if (indexOutside(text, '{') !== -1 || text.includes('}')) {
      return fail(line, 'Blocks look like "loop [label] {" and close with "}" on its own line.')
    }
    const act = ACTIVATION.exec(text)
    if (act) {
      const who = ensure(parseNamed(act[2]), line)
      if (!who) return
      const kind = act[1] as 'activate' | 'deactivate'
      const depth = active.get(who) ?? 0
      if (kind === 'deactivate' && depth === 0) return fail(line, `"${who}" is not active.`)
      active.set(who, depth + (kind === 'activate' ? 1 : -1))
      items().push({ kind, who, line })
      return
    }
    const colon = indexOutside(text, ':')
    const body = colon === -1 ? text : text.slice(0, colon)
    const label = colon === -1 ? '' : unquote(text.slice(colon + 1).trim())
    if (message(body, label, line)) return
    ensure(parseNamed(text), line)
  })

  for (const entry of stack) if (entry.block) fail(entry.line, `Block "${entry.block.type}" is never closed.`)
  // Unclosed blocks still draw: fold them into their parents, innermost first.
  while (stack.length) {
    const top = stack.pop()!
    if (top.block) items().push(top.block)
    else items().push(...top.items)
  }
  errors.sort((a, b) => a.line - b.line)

  return { model: { settings, participants: Array.from(participants.values()), items: root }, errors }
}
