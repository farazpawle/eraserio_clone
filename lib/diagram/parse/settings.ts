import { DEFAULT_SETTINGS, type DiagramError, type DiagramSettings } from '../types'

const ALLOWED: Record<Exclude<keyof DiagramSettings, 'title'>, readonly string[]> = {
  direction: ['right', 'down', 'left', 'up'],
  colorMode: ['pastel', 'bold', 'outline'],
  styleMode: ['plain', 'shadow', 'watercolor'],
  typeface: ['rough', 'clean', 'mono'],
}

const SETTING_LINE = /^\s*(title|direction|colorMode|styleMode|typeface)\s+(.+)$/
const BARE_KEY = /^\s*(title|direction|colorMode|styleMode|typeface)\s*$/
// Node and edge lines share these characters; a setting never has them.
const SYNTAX_CHARS = /[[{><:]/

function matchSetting(line: string): { key: keyof DiagramSettings; value: string } | null {
  const m = SETTING_LINE.exec(line)
  if (!m) return null
  const key = m[1] as keyof DiagramSettings
  const value = m[2].trim()
  if (key !== 'title' && SYNTAX_CHARS.test(value)) return null
  return { key, value }
}

function listOf(values: readonly string[]): string {
  return `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`
}

export function parseSettings(lines: string[]): {
  settings: DiagramSettings
  rest: string[]
  errors: DiagramError[]
} {
  const settings: DiagramSettings = { ...DEFAULT_SETTINGS }
  const errors: DiagramError[] = []
  const rest = lines.map((line, i) => {
    const bare = BARE_KEY.exec(line)
    if (bare) {
      errors.push({ line: i + 1, message: `Missing value for ${bare[1]}.` })
      return ''
    }
    const found = matchSetting(line)
    if (!found) return line
    if (found.key === 'title') {
      settings.title = found.value
    } else if (ALLOWED[found.key].includes(found.value)) {
      Object.assign(settings, { [found.key]: found.value })
    } else {
      errors.push({
        line: i + 1,
        message: `Unknown ${found.key} "${found.value}". Use ${listOf(ALLOWED[found.key])}.`,
      })
    }
    return ''
  })
  return { settings, rest, errors }
}

// Rewrites the last line that sets `key`, or adds one at the top.
export function setSetting(code: string, key: keyof DiagramSettings, value: string): string {
  const lines = code.split('\n')
  let at = -1
  lines.forEach((line, i) => {
    if (matchSetting(line)?.key === key) at = i
  })
  if (at === -1) return `${key} ${value}\n${code}`
  lines[at] = `${key} ${value}`
  return lines.join('\n')
}
