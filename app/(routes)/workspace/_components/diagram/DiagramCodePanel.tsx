'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { autocompletion, completionStatus } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { setDiagnostics } from '@codemirror/lint'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { DiagramError } from '@/lib/diagram/types'
import { diagramCompletions, diagramLanguage, diagramTheme, toDiagnostics } from './codeMirrorSetup'

type Props = {
  code: string
  errors: DiagramError[]
  nodeNames: string[]
  readOnly: boolean
  onChange(code: string): void
  onClose(): void
  title?: string
  header?: React.ReactNode
}

const DEBOUNCE_MS = 150
// Marks edits that came from the `code` prop, so they are not reported back.
const fromProps = Annotation.define<boolean>()

export function footerText(errors: DiagramError[]): string {
  if (errors.length === 0) return 'Diagram up to date'
  const [first, ...rest] = errors
  const message = first.line > 0 ? `Line ${first.line}: ${first.message}` : first.message
  return rest.length > 0 ? `${message} (+${rest.length} more)` : message
}

export default function DiagramCodePanel({
  code,
  errors,
  nodeNames,
  readOnly,
  onChange,
  onClose,
  title = 'Diagram code',
  header,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  // Extensions that can change after mount live in compartments; callbacks go through refs.
  const readOnlyCompartment = useRef(new Compartment())
  const completionCompartment = useRef(new Compartment())
  const latest = useRef({ onChange, onClose })
  latest.current = { onChange, onClose }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: code,
        extensions: [
          history(),
          keymap.of([
            {
              key: 'Escape',
              // Escape belongs to the completion popup while it is open.
              run: (v) => {
                if (completionStatus(v.state)) return false
                latest.current.onClose()
                return true
              },
            },
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          diagramLanguage,
          diagramTheme,
          completionCompartment.current.of(autocompletion({ override: [diagramCompletions(nodeNames)] })),
          readOnlyCompartment.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.contentAttributes.of({ 'aria-label': 'Diagram code', spellcheck: 'false', autocapitalize: 'off' }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged || u.transactions.some((t) => t.annotation(fromProps))) return
            clearTimeout(timer)
            timer = setTimeout(() => latest.current.onChange(u.state.doc.toString()), DEBOUNCE_MS)
          }),
        ],
      }),
    })
    view.current = editor
    return () => {
      clearTimeout(timer)
      editor.destroy()
      view.current = null
    }
    // The editor is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The parent owns the code (undo, other edits): follow it without echoing it back.
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== code) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: code }, annotations: fromProps.of(true) })
    }
  }, [code])

  useEffect(() => {
    view.current?.dispatch({
      effects: [
        readOnlyCompartment.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        completionCompartment.current.reconfigure(autocompletion({ override: [diagramCompletions(nodeNames)] })),
      ],
    })
  }, [readOnly, nodeNames])

  useEffect(() => {
    const v = view.current
    if (!v) return
    const lines = v.state.doc.lines
    const placed = errors.filter((e) => e.line >= 1 && e.line <= lines)
    v.dispatch(setDiagnostics(v.state, toDiagnostics(placed, v.state.doc)))
  }, [errors, code])

  const hasErrors = errors.length > 0

  return (
    <aside
      aria-label="Diagram code"
      className="diagram-code flex flex-col overflow-hidden rounded-[var(--g-radius)] border border-g-line bg-g-panel text-g-text shadow-[var(--g-shadow)]"
    >
      <header className="flex items-center gap-2 border-b border-g-line py-2 pl-3.5 pr-2">
        <h2 className="m-0 flex-1 text-[13px] font-semibold">{title}</h2>
        {header}
        <button
          type="button"
          aria-label="Hide diagram code"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-g-muted hover:bg-g-hover hover:text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11 max-md:w-11"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <div ref={host} className="diagram-code-editor min-h-0 flex-1" />
      <footer className="flex flex-col gap-1 border-t border-g-line px-3.5 py-2 text-xs text-g-muted">
        <span role="status" className={hasErrors ? 'text-g-danger' : 'text-g-ok'}>
          {footerText(errors)}
        </span>
        <a
          href="/help/diagram-syntax"
          target="_blank"
          rel="noopener noreferrer"
          className="text-g-accent underline-offset-2 hover:underline max-md:flex max-md:min-h-11 max-md:items-center"
        >
          Syntax help
        </a>
      </footer>
    </aside>
  )
}
