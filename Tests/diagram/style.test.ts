import { FONT_FAMILY } from '@excalidraw/excalidraw'
import { COLOR_NAMES, DEFAULT_SETTINGS } from '@/lib/diagram/types'
import type { ColorMode, DiagramSettings } from '@/lib/diagram/types'
import { FONT, contrastRatio, darkCanvasColor, styleFor } from '@/lib/diagram/render/style'

const COLOR_MODES: ColorMode[] = ['pastel', 'bold', 'outline']
const s = (over: Partial<DiagramSettings>): DiagramSettings => ({ ...DEFAULT_SETTINGS, ...over })

describe('colour modes', () => {
  it('pastel: light fill, darker stroke of the same hue, solid', () => {
    const st = styleFor({ color: 'blue' }, s({ colorMode: 'pastel' }))
    expect(st.fillStyle).toBe('solid')
    expect(contrastRatio(st.backgroundColor, '#ffffff')).toBeLessThan(contrastRatio(st.strokeColor, '#ffffff'))
    expect(st.backgroundColor).not.toBe(st.strokeColor)
  })
  it('bold: saturated fill, darker than the pastel fill', () => {
    const bold = styleFor({ color: 'blue' }, s({ colorMode: 'bold' }))
    const pastel = styleFor({ color: 'blue' }, s({ colorMode: 'pastel' }))
    expect(contrastRatio(bold.backgroundColor, '#ffffff')).toBeGreaterThan(
      contrastRatio(pastel.backgroundColor, '#ffffff'),
    )
  })
  it('outline: transparent fill, coloured stroke, width 2', () => {
    const st = styleFor({ color: 'red' }, s({ colorMode: 'outline' }))
    expect(st.backgroundColor).toBe('transparent')
    expect(st.strokeColor).not.toBe('transparent')
    expect(st.strokeWidth).toBe(2)
  })
  it('defaults to gray', () => {
    expect(styleFor({}, s({}))).toEqual(styleFor({ color: 'gray' }, s({})))
  })
})

describe('style modes', () => {
  it('plain: roughness 0, no shadow', () => {
    const st = styleFor({}, s({ styleMode: 'plain' }))
    expect([st.roughness, st.shadow]).toEqual([0, false])
  })
  it('shadow: roughness 0, shadow', () => {
    const st = styleFor({}, s({ styleMode: 'shadow' }))
    expect([st.roughness, st.shadow]).toEqual([0, true])
  })
  it('watercolor: hachure, roughness 2', () => {
    const st = styleFor({}, s({ styleMode: 'watercolor' }))
    expect([st.fillStyle, st.roughness]).toEqual(['hachure', 2])
  })
})

describe('fonts', () => {
  it('typeface maps to FONT', () => {
    expect(styleFor({}, s({ typeface: 'rough' })).fontFamily).toBe(FONT.rough)
    expect(styleFor({}, s({ typeface: 'clean' })).fontFamily).toBe(FONT.clean)
    expect(styleFor({}, s({ typeface: 'mono' })).fontFamily).toBe(FONT.mono)
  })
  it('FONT matches the Excalidraw package', () => {
    expect(FONT.rough).toBe(FONT_FAMILY.Excalifont)
    expect(FONT.clean).toBe(FONT_FAMILY.Nunito)
    expect(FONT.mono).toBe(FONT_FAMILY['Comic Shanns'])
  })
})

describe('groups', () => {
  it('have a lighter fill than nodes and strokeWidth 1', () => {
    const node = styleFor({ color: 'blue' }, s({}), 'node')
    const group = styleFor({ color: 'blue' }, s({}), 'group')
    expect(contrastRatio(group.backgroundColor, '#ffffff')).toBeLessThan(
      contrastRatio(node.backgroundColor, '#ffffff'),
    )
    expect(group.strokeWidth).toBe(1)
  })
})

describe('darkCanvasColor', () => {
  it('turns white into Excalidraw dark canvas (#121212)', () => {
    expect(darkCanvasColor('#ffffff')).toBe('#121212')
  })
  it('keeps hue family: a blue stays blue-ish', () => {
    const [r, , b] = [1, 3, 5].map((i) => parseInt(darkCanvasColor('#4dabf7').slice(i, i + 2), 16))
    expect(b).toBeGreaterThan(r)
  })
})

describe('contrast', () => {
  const themes = [
    { name: 'light', canvas: '#ffffff', map: (c: string) => c },
    { name: 'dark', canvas: '#121212', map: darkCanvasColor },
  ]
  for (const theme of themes) {
    it(`text is at least 4.5:1 on its background (${theme.name} canvas)`, () => {
      const fails: string[] = []
      for (const colorMode of COLOR_MODES) {
        for (const color of COLOR_NAMES) {
          for (const kind of ['node', 'group'] as const) {
            const st = styleFor({ color }, s({ colorMode }), kind)
            const bg = st.backgroundColor === 'transparent' ? theme.canvas : theme.map(st.backgroundColor)
            const ratio = contrastRatio(theme.map(st.textColor), bg)
            if (ratio < 4.5) fails.push(`${colorMode}/${color}/${kind}: ${ratio.toFixed(2)}`)
          }
        }
      }
      expect(fails).toEqual([])
    })
  }
})
