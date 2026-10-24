import React from 'react'
import { ALLOWED, parseSettings, setSetting } from '@/lib/diagram/parse/settings'
import { DIAGRAM_TYPES, type DiagramSettings, type DiagramType } from '@/lib/diagram/types'

type SettingKey = Exclude<keyof DiagramSettings, 'title'>

const TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flowchart',
  cloud: 'Cloud architecture',
}
const label = (value: string) => value[0].toUpperCase() + value.slice(1)

const SETTING_SELECTS: { key: SettingKey; name: string }[] = [
  { key: 'direction', name: 'Direction' },
  { key: 'colorMode', name: 'Colour' },
  { key: 'styleMode', name: 'Style' },
  { key: 'typeface', name: 'Font' },
]

const selectClass =
  'h-8 min-w-0 rounded-md border border-g-line bg-g-panel px-1.5 text-xs text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11 max-md:flex-auto max-md:text-base'

export default function DiagramStyleBar({
  code,
  diagramType,
  onCode,
  onType,
}: {
  code: string
  diagramType: DiagramType
  onCode: (code: string) => void
  onType: (type: DiagramType) => void
}) {
  const { settings } = parseSettings(code.split(/\r?\n/))

  return (
    <div className="order-last flex basis-full flex-wrap items-center gap-1.5">
      <select
        aria-label="Type"
        value={diagramType}
        onChange={(e) => e.target.value !== diagramType && onType(e.target.value as DiagramType)}
        className={selectClass}
      >
        {DIAGRAM_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      {SETTING_SELECTS.map(({ key, name }) => (
        <select
          key={key}
          aria-label={name}
          value={settings[key]}
          onChange={(e) => e.target.value !== settings[key] && onCode(setSetting(code, key, e.target.value))}
          className={selectClass}
        >
          {ALLOWED[key].map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
