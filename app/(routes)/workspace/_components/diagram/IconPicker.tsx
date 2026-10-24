import React, { useState, type MutableRefObject } from 'react'
import { setIconOnLine } from '@/lib/diagram/icons/codeEdit'
import { iconUrl, type Registry } from '@/lib/diagram/icons/registry'

const RESULTS = 40

// Sets the icon on the code line the cursor is on. A shape on the canvas can't name the node: clicking
// a diagram selects the whole diagram.
export default function IconPicker({
  icons,
  code,
  cursorLine,
  onCode,
}: {
  icons: Registry | null
  code: string
  cursorLine: MutableRefObject<number>
  onCode: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [missed, setMissed] = useState(false)

  const onNodeLine = open && setIconOnLine(code, cursorLine.current, 'probe') !== null
  const results = open && icons ? icons.searchIcons(query, RESULTS) : []

  const pick = (id: string) => {
    const next = setIconOnLine(code, cursorLine.current, id)
    if (next === null) return setMissed(true)
    setMissed(false)
    setOpen(false)
    onCode(next)
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        disabled={!icons}
        title={icons ? undefined : 'Icons are loading'}
        onClick={() => {
          setMissed(false)
          setOpen(!open)
        }}
        className="h-8 rounded-md border border-g-line bg-g-panel px-2 text-xs text-g-text hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent disabled:opacity-50 max-md:h-11 max-md:flex-auto max-md:text-base"
      >
        Icon
      </button>
      {open && (
        <div role="group" aria-label="Icon picker" className="flex basis-full flex-col gap-1.5">
          <input
            type="search"
            aria-label="Search icons"
            placeholder="Search icons, e.g. bucket"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-g-line bg-g-panel px-2 text-xs text-g-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent max-md:h-11 max-md:text-base"
          />
          {(!onNodeLine || missed) && <p className="m-0 text-xs text-g-muted">Put the cursor on a node line first.</p>}
          <ul className="m-0 grid max-h-48 list-none grid-cols-3 gap-1 overflow-y-auto p-0 max-md:grid-cols-2">
            {results.map((icon) => (
              <li key={icon.id}>
                <button
                  type="button"
                  disabled={!onNodeLine}
                  title={icon.id}
                  onClick={() => pick(icon.id)}
                  className="flex min-h-8 w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-g-text hover:bg-g-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g-accent disabled:opacity-50 max-md:min-h-11"
                >
                  <img src={iconUrl(icon.id)} alt="" width={24} height={24} loading="lazy" className="shrink-0" />
                  <span className="min-w-0 truncate">{icon.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {icons && results.length === 0 && <p className="m-0 text-xs text-g-muted">No icons match.</p>}
        </div>
      )}
    </>
  )
}
