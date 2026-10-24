/** @jest-environment jsdom */
import { CompletionContext } from '@codemirror/autocomplete'
import { readFileSync } from 'fs'
import { EditorState, Text } from '@codemirror/state'
import { contrastRatio } from '@/lib/diagram/render/style'
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

  it('completes hyphenated names', async () => {
    expect(await complete('A > api-gate|', ['api-gateway'])).toContain('api-gateway')
  })

  it('still suggests names after an attribute block that has a colon', async () => {
    expect(await complete('A [color: red] > Da|')).toContain('Database')
  })

  it('offers nothing in an edge label', async () => {
    expect(await complete('A > B: We|')).toEqual([])
  })
})

describe('code colour tokens', () => {
  const css = readFileSync('app/globals.css', 'utf8')
  const block = (re: RegExp) => re.exec(css)![1]
  const themes = {
    dark: block(/:root \{([^}]*--g-bg: #0b0b0f[^}]*)\}/),
    light: block(/\[data-theme="light"\] \{([^}]*)\}/),
  }

  it.each(['dark', 'light'] as const)('keeps code text readable (4.5:1) in the %s theme', (theme) => {
    const value = (name: string) => new RegExp(`--g-${name}: (#[0-9a-f]{6})`).exec(themes[theme])![1]
    for (const token of ['code-keyword', 'code-string', 'code-ok', 'c-purple', 'accent', 'faint', 'muted']) {
      expect(contrastRatio(value(token), value('panel'))).toBeGreaterThanOrEqual(4.5)
    }
  })
})
