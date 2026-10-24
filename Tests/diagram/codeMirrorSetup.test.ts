/** @jest-environment jsdom */
import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState, Text } from '@codemirror/state'
import { diagramCompletions, toDiagnostics } from '@/app/(routes)/workspace/_components/diagram/codeMirrorSetup'

// `|` in the text marks the cursor.
async function complete(text: string, names: string[] = ['Web Server', 'Database']) {
  const pos = text.indexOf('|')
  const state = EditorState.create({ doc: text.replace('|', '') })
  const result = await diagramCompletions(names)(new CompletionContext(state, pos, true))
  return result?.options.map((o) => o.label) ?? []
}

describe('toDiagnostics', () => {
  it('spans the whole line of each error', () => {
    const doc = Text.of(['A > B', 'oops here', 'C'])
    const line2 = doc.line(2)

    expect(toDiagnostics([{ line: 2, message: 'Bad line' }], doc)).toEqual([
      { from: line2.from, to: line2.to, severity: 'error', message: 'Bad line' },
    ])
  })
})

describe('diagramCompletions', () => {
  it('offers attribute keys inside brackets', async () => {
    expect(await complete('A [sh|')).toContain('shape')
  })

  it('offers shapes after shape:', async () => {
    expect(await complete('A [shape: cy|')).toContain('cylinder')
  })

  it('offers colours after color:', async () => {
    expect(await complete('A [color: bl|')).toContain('blue')
  })

  it('offers setting keys at the line start', async () => {
    expect(await complete('colorM|')).toContain('colorMode')
  })

  it('offers setting values after a setting key', async () => {
    expect(await complete('colorMode p|')).toContain('pastel')
  })

  it('offers node names at an edge position', async () => {
    expect(await complete('A > We|')).toContain('Web Server')
  })

  it('offers nothing in an edge label', async () => {
    expect(await complete('A > B: We|')).toEqual([])
  })
})
