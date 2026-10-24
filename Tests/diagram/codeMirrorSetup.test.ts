/** @jest-environment jsdom */
import { CompletionContext } from '@codemirror/autocomplete'
import { readFileSync } from 'fs'
import { EditorState, Text } from '@codemirror/state'
import { contrastRatio } from '@/lib/diagram/render/style'
import { createRegistry, type IconEntry, type Registry } from '@/lib/diagram/icons/registry'
import { diagramCompletions, diagramLanguage, toDiagnostics } from '@/app/(routes)/workspace/_components/diagram/codeMirrorSetup'

// `|` in the text marks the cursor.
async function completion(text: string, names: string[] = ['Web Server', 'Database'], icons?: Registry | null) {
  const pos = text.indexOf('|')
  const state = EditorState.create({ doc: text.replace('|', '') })
  return diagramCompletions(names, icons)(new CompletionContext(state, pos, true))
}
async function complete(text: string, names?: string[], icons?: Registry | null) {
  return (await completion(text, names, icons))?.options.map((o) => o.label) ?? []
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

describe('diagramLanguage', () => {
  it('marks every setting key at the start of a line as a keyword', () => {
    for (const key of ['title', 'direction', 'colorMode', 'styleMode', 'typeface']) {
      const tree = diagramLanguage.parser.parse(`${key} x`)
      const names: string[] = []
      tree.iterate({ enter: (n) => void names.push(n.name) })
      expect(names).toContain('keyword')
    }
  })
})

describe('icon completions', () => {
  const entry = (id: string, label: string, keywords: string[] = []): IconEntry => ({ id, provider: 'aws', label, keywords, aliases: [] })
  const many = Array.from({ length: 30 }, (_, i) => entry(`aws-svc-${i}`, `Service ${i}`))
  const icons = createRegistry({ version: 1, icons: [entry('aws-ec2', 'Amazon EC2'), entry('aws-s3', 'Simple Storage', ['bucket']), ...many] })

  it('searches the registry after icon:', async () => {
    expect((await complete('Web [icon: ec|', undefined, icons))[0]).toBe('aws-ec2')
  })

  it('finds icons by keyword, not only by the typed text in the id', async () => {
    expect(await complete('Web [icon: bucket|', undefined, icons)).toEqual(['aws-s3'])
  })

  it('works after another attribute and offers at most 20', async () => {
    const options = await complete('Web [color: red, icon: svc|', undefined, icons)
    expect(options).toHaveLength(20)
  })

  it('previews the icon with its image', async () => {
    const result = await completion('Web [icon: ec|', undefined, icons)
    const info = result!.options[0].info as () => HTMLImageElement
    expect(info().getAttribute('src')).toBe('/icons/aws/aws-ec2.svg')
  })

  it('offers no icons without a registry, and does not throw', async () => {
    expect(await complete('Web [icon: ec|')).toEqual([])
    expect(await complete('Web [icon: ec|', undefined, null)).toEqual([])
  })

  it('leaves shape and colour completion alone', async () => {
    expect(await complete('A [shape: cy|', undefined, icons)).toContain('cylinder')
  })
})

describe('sequence completions and colours', () => {
  const seq = async (text: string, names = ['A', 'B']) => {
    const state = EditorState.create({ doc: text.replace('|', '') })
    const result = await diagramCompletions(names, null, 'sequence')(new CompletionContext(state, text.indexOf('|'), true))
    return result?.options.map((o) => o.label) ?? []
  }

  it('offers block and activation words at a line start, plus the settings keys', async () => {
    const options = await seq('|')
    for (const word of ['activate', 'deactivate', 'loop', 'alt', 'opt', 'par', 'title']) expect(options).toContain(word)
  })

  it('offers participants after activate', async () => {
    expect(await seq('activate |')).toEqual(['A', 'B'])
  })

  it('offers only label and color inside brackets', async () => {
    expect((await seq('A [|')).sort()).toEqual(['color', 'label'])
  })

  it('does not offer sequence words in a flowchart', async () => {
    expect(await complete('|')).not.toContain('loop')
  })

  it('colours the arrow and the block words', () => {
    const names = (code: string) => {
      const out: string[] = []
      diagramLanguage.parser.parse(code).iterate({ enter: (n) => void out.push(n.name) })
      return out
    }
    expect(names('A --> B')).toContain('operator')
    expect(names('loop [x] {')).toContain('keyword')
  })
})
