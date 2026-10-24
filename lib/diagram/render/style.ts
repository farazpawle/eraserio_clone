import type { ColorName, DiagramSettings, ColorMode } from '../types'

// Excalidraw 0.18.1 FONT_FAMILY values (Excalifont, Nunito, Comic Shanns); a test checks them against the package.
export const FONT = { rough: 5, clean: 6, mono: 8 } as const

export type ElementStyle = {
  strokeColor: string
  backgroundColor: string
  textColor: string
  fillStyle: 'solid' | 'hachure'
  roughness: 0 | 1 | 2
  strokeWidth: 1 | 2
  fontFamily: number
}

export const fillOf = (style: ElementStyle) => ({
  strokeColor: style.strokeColor,
  backgroundColor: style.backgroundColor,
  fillStyle: style.fillStyle,
  roughness: style.roughness,
  strokeWidth: style.strokeWidth,
})

const DARK = '#1e1e1e'
// Text that sits straight on the canvas (edge labels, hachure fills); the dark theme's filter lightens it.
export const CANVAS_TEXT = DARK
const WHITE = '#ffffff'

// [stroke, fill, text] per colour. Text is chosen so it reads at 4.5:1 on a light and on a dark canvas.
type Row = readonly [stroke: string, fill: string, text: string]
const TABLES: Record<ColorMode, Record<ColorName, Row>> = {
  pastel: {
    blue: ['#1971c2', '#a5d8ff', DARK],
    green: ['#2f9e44', '#b2f2bb', DARK],
    red: ['#e03131', '#ffc9c9', DARK],
    orange: ['#e8590c', '#ffd8a8', DARK],
    purple: ['#6741d9', '#d0bfff', DARK],
    yellow: ['#f08c00', '#ffec99', DARK],
    teal: ['#0c8599', '#96f2d7', DARK],
    pink: ['#c2255c', '#fcc2d7', DARK],
    gray: ['#495057', '#dee2e6', DARK],
  },
  bold: {
    blue: ['#1864ab', '#1971c2', WHITE],
    green: ['#237032', '#27803a', WHITE],
    red: ['#a61e1e', '#c92a2a', WHITE],
    orange: ['#a63a0b', '#c2410c', WHITE],
    purple: ['#5f3dc4', '#6741d9', WHITE],
    yellow: ['#e67700', '#ffd43b', DARK],
    teal: ['#0a5c6b', '#0b7285', WHITE],
    pink: ['#a61e4d', '#d6336c', WHITE],
    gray: ['#343a40', '#495057', WHITE],
  },
  outline: {
    blue: ['#1971c2', 'transparent', DARK],
    green: ['#2f9e44', 'transparent', DARK],
    red: ['#e03131', 'transparent', DARK],
    orange: ['#e8590c', 'transparent', DARK],
    purple: ['#6741d9', 'transparent', DARK],
    yellow: ['#f08c00', 'transparent', DARK],
    teal: ['#0c8599', 'transparent', DARK],
    pink: ['#c2255c', 'transparent', DARK],
    gray: ['#495057', 'transparent', DARK],
  },
}

// Groups sit behind nodes, so their fill is always a very light tint.
const GROUP_FILL: Record<ColorName, string> = {
  blue: '#e7f5ff',
  green: '#ebfbee',
  red: '#fff5f5',
  orange: '#fff4e6',
  purple: '#f3f0ff',
  yellow: '#fff9db',
  teal: '#e6fcf5',
  pink: '#fff0f6',
  gray: '#f1f3f5',
}

export function styleFor(
  item: { color?: ColorName },
  settings: DiagramSettings,
  kind: 'node' | 'group' = 'node',
): ElementStyle {
  const name = item.color ?? 'gray'
  const [stroke, fill, text] = TABLES[settings.colorMode][name]
  const outline = settings.colorMode === 'outline'
  const group = kind === 'group'
  const watercolor = settings.styleMode === 'watercolor'
  return {
    strokeColor: stroke,
    backgroundColor: group ? (outline ? 'transparent' : GROUP_FILL[name]) : fill,
    // Hachure leaves the canvas showing, so a fill colour can't carry the text.
    textColor: group || watercolor ? CANVAS_TEXT : text,
    fillStyle: watercolor ? 'hachure' : 'solid',
    roughness: watercolor ? 2 : 0,
    strokeWidth: outline && !group ? 2 : 1,
    fontFamily: FONT[settings.typeface],
  }
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

// WCAG 2.x contrast ratio between two #rrggbb colours.
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = toRgb(hex).map((c) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Excalidraw draws the dark canvas with the CSS filter `invert(93%) hue-rotate(180deg)`.
// Same maths as the Filter Effects spec, in 0-1 sRGB, no linearisation.
// hue-rotate(180deg): cos = -1, sin = 0 in the spec's matrix.
const HUE_180 = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856],
]
export function darkCanvasColor(hex: string): string {
  const inverted = toRgb(hex).map((c) => 0.93 + (c / 255) * (1 - 2 * 0.93))
  const rotated = HUE_180.map((row) => row.reduce((sum, k, i) => sum + k * inverted[i], 0))
  return toHex(rotated.map((c) => Math.min(1, Math.max(0, c))))
}
