import type { CompletionContext, CompletionSource } from '@codemirror/autocomplete'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import type { Diagnostic } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { ATTR_KEYS } from '@/lib/diagram/parse/flow'
import { ALLOWED } from '@/lib/diagram/parse/settings'
import { COLOR_NAMES, SHAPES, type DiagramError } from '@/lib/diagram/types'

const SETTING_KEYS = ['title', ...Object.keys(ALLOWED)]

export function toDiagnostics(
  errors: DiagramError[],
  doc: { line(n: number): { from: number; to: number } }
): Diagnostic[] {
  return errors.map(({ line, message }) => {
    const { from, to } = doc.line(line)
    return { from, to, severity: 'error', message }
  })
}

const toOptions = (labels: readonly string[], type: string) => labels.map((label) => ({ label, type }))

export function diagramCompletions(nodeNames: string[]): CompletionSource {
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)
    const done = (word: string, options: { label: string; type: string }[]) => ({
      from: context.pos - word.length,
      options,
      validFor: /^[\w -]*$/,
    })

    // Inside an unclosed [ ]: attribute keys, or the values of shape / color.
    if (before.lastIndexOf('[') > before.lastIndexOf(']')) {
      const inside = before.slice(before.lastIndexOf('[') + 1)
      const value = /(shape|color):\s*(\w*)$/.exec(inside)
      if (value) return done(value[2], toOptions(value[1] === 'shape' ? SHAPES : COLOR_NAMES, 'enum'))
      const key = /(?:^|,)\s*(\w*)$/.exec(inside)
      return key ? done(key[1], toOptions(ATTR_KEYS, 'property')) : null
    }

    const setting = new RegExp(`^\\s*(${SETTING_KEYS.slice(1).join('|')})\\s+(\\w*)$`).exec(before)
    if (setting) {
      return done(setting[2], toOptions(ALLOWED[setting[1] as keyof typeof ALLOWED], 'enum'))
    }

    // After a colon the text is a label, which is free text.
    if (before.slice(before.lastIndexOf(']') + 1).includes(':')) return null

    const word = /^\s*(\w*)$/.exec(before)
    const keys = word ? toOptions(SETTING_KEYS, 'keyword') : []
    // Names may hold spaces and hyphens: the typed part starts after the last operator or comma.
    const name = before.split(/[><,{]| - /).pop()!.trimStart()
    return done(word ? word[1] : name, [...keys, ...toOptions(nodeNames, 'variable')])
  }
}

const SETTING_KEY_START = new RegExp(`^(?:${SETTING_KEYS.join('|')})\\b`)
const OPERATOR = /^(?:<>|-->|>|<|-)/

export const diagramLanguage = StreamLanguage.define<{ inBrackets: boolean }>({
  startState: () => ({ inBrackets: false }),
  token(stream, state) {
    if (stream.sol() && stream.match(/^\s*\/\/.*/)) return 'comment'
    if (stream.eatSpace()) return null
    if (stream.match(/^"[^"]*"?/)) return 'string'
    if (stream.eat('[')) {
      state.inBrackets = true
      return 'bracket'
    }
    if (stream.eat(']')) {
      state.inBrackets = false
      return 'bracket'
    }
    if (state.inBrackets && stream.match(/^\w+(?=\s*:)/)) return 'propertyName'
    if (stream.sol() && stream.match(SETTING_KEY_START)) return 'keyword'
    if (stream.match(OPERATOR)) return 'operator'
    stream.next()
    return null
  },
})

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: 'var(--g-faint)', fontStyle: 'italic' },
  { tag: tags.keyword, color: 'var(--g-code-keyword)' },
  { tag: tags.operator, color: 'var(--g-accent)', fontWeight: '600' },
  { tag: tags.string, color: 'var(--g-code-string)' },
  { tag: tags.propertyName, color: 'var(--g-c-purple)' },
  { tag: tags.bracket, color: 'var(--g-muted)' },
])

const theme = EditorView.theme({
  '&': { color: 'var(--g-text)', backgroundColor: 'var(--g-panel)', height: '100%' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.75' },
  '.cm-content': { fontSize: '12.5px', caretColor: 'var(--g-text)', padding: '12px 0' },
  '.cm-cursor': { borderLeftColor: 'var(--g-text)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--g-accent-soft)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--g-danger)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--g-danger)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--g-panel-2)',
    color: 'var(--g-text)',
    border: '1px solid var(--g-line-2)',
    borderRadius: '6px',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--g-accent-soft)',
    color: 'var(--g-text)',
  },
})

export const diagramTheme = [theme, syntaxHighlighting(highlight)]
