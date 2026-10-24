/** @jest-environment node */
import { DEFAULT_SETTINGS } from '@/lib/diagram/types'
import { parseSettings, setSetting } from '@/lib/diagram/parse/settings'

describe('parseSettings', () => {
  it.each([
    ['direction', ['right', 'down', 'left', 'up']],
    ['colorMode', ['pastel', 'bold', 'outline']],
    ['styleMode', ['plain', 'shadow', 'watercolor']],
    ['typeface', ['rough', 'clean', 'mono']],
  ])('reads every %s value', (key, values) => {
    for (const value of values) {
      const { settings, errors } = parseSettings([`${key} ${value}`])
      expect(settings).toEqual({ ...DEFAULT_SETTINGS, [key]: value })
      expect(errors).toEqual([])
    }
  })

  it('keeps the spaces in a title', () => {
    expect(parseSettings(['title My checkout flow']).settings.title).toBe(
      'My checkout flow',
    )
  })

  it('falls back to defaults for missing keys', () => {
    expect(parseSettings(['A > B']).settings).toEqual(DEFAULT_SETTINGS)
  })

  it('reports an unknown value on its line and keeps the default', () => {
    const { settings, errors } = parseSettings(['A', 'B', 'colorMode neon'])
    expect(errors).toEqual([
      {
        line: 3,
        message: 'Unknown colorMode "neon". Use pastel, bold or outline.',
      },
    ])
    expect(settings.colorMode).toBe(DEFAULT_SETTINGS.colorMode)
  })

  it('reports a key with no value', () => {
    expect(parseSettings(['direction']).errors).toHaveLength(1)
  })

  it('does not treat node or edge lines as settings', () => {
    const lines = ['Direction Service [shape: oval]', 'direction > api']
    const { settings, rest, errors } = parseSettings(lines)
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(rest).toEqual(lines)
    expect(errors).toEqual([])
  })

  it('keeps the line count and blanks only settings lines', () => {
    const { rest } = parseSettings(['direction down', 'A > B', 'title T'])
    expect(rest).toEqual(['', 'A > B', ''])
  })
})

describe('setSetting', () => {
  it('adds a missing setting at the top', () => {
    expect(setSetting('A > B', 'direction', 'down')).toBe('direction down\nA > B')
  })

  it('replaces an existing line in place', () => {
    expect(setSetting('A\ndirection right\nB', 'direction', 'down')).toBe(
      'A\ndirection down\nB',
    )
  })

  it('replaces the last occurrence when the key appears twice', () => {
    expect(
      setSetting('direction up\nA\ndirection right', 'direction', 'down'),
    ).toBe('direction up\nA\ndirection down')
  })
})
