import { BRAND_NAME } from '@/lib/brand'
import { ALLOWED } from '@/lib/diagram/parse/settings'
import { STARTERS } from '@/lib/diagram/templates'
import { COLOR_NAMES, DEFAULT_SETTINGS, SHAPES } from '@/lib/diagram/types'
import { EXAMPLES } from './examples'

export const metadata = { title: `Diagram syntax · ${BRAND_NAME}` }

const ALL_EXAMPLES = [
  ...EXAMPLES,
  { title: 'Starter: flowchart', code: STARTERS.flowchart },
  { title: 'Starter: cloud', code: STARTERS.cloud },
]

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-g-line bg-g-panel-2 p-3 text-sm text-g-text font-[family-name:var(--font-mono)]">
      <code>{children}</code>
    </pre>
  )
}

export default function DiagramSyntaxPage() {
  return (
    <main className="min-h-screen bg-g-bg px-4 py-10 text-g-text">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Diagram syntax</h1>
          <p className="mt-2 text-g-muted">
            Type text in the code panel and {BRAND_NAME} draws it. Each line is a setting, a node, a group or a set
            of edges.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-g-muted">
            Each setting is a line: its name, a space, then a value. <code>title</code> takes any text.
          </p>
          <ul className="space-y-1 text-sm">
            {Object.entries(ALLOWED).map(([key, values]) => (
              <li key={key}>
                <code>{key}</code> (default <code>{DEFAULT_SETTINGS[key as keyof typeof ALLOWED]}</code>):{' '}
                {values.map((v) => (
                  <code key={v} className="mr-2">
                    {v}
                  </code>
                ))}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Shapes</h2>
          <p className="text-sm">
            {SHAPES.map((s) => (
              <code key={s} className="mr-2">
                {s}
              </code>
            ))}
          </p>
          <h2 className="pt-2 text-lg font-semibold">Colours</h2>
          <p className="text-sm">
            {COLOR_NAMES.map((c) => (
              <code key={c} className="mr-2">
                {c}
              </code>
            ))}
          </p>
        </section>

        {ALL_EXAMPLES.map((e) => (
          <section key={e.title} className="space-y-3">
            <h2 className="text-lg font-semibold">{e.title}</h2>
            {'note' in e && e.note && <p className="text-g-muted">{e.note}</p>}
            <Code>{e.code}</Code>
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Good to know</h2>
          <ul className="list-disc space-y-1 pl-5 text-g-muted">
            <li>
              Groups must be written on separate lines. The one-line form <code>G {'{ A, B }'}</code> is not
              supported.
            </li>
            <li>A label after a colon applies to every edge on that line.</li>
            <li>
              Put a label in double quotes if it contains <code>//</code>, <code>{'{'}</code> or <code>:</code>.
            </li>
            <li>
              Names cannot contain <code>[ ] {'{ }'} &lt; &gt; :</code> commas or quotes.
            </li>
          </ul>
        </section>
      </article>
    </main>
  )
}
