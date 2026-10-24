import type { Shape } from '../types'

type Point = [number, number]

const CURVE_POINTS = 8

// Points along an elliptical arc from angle a0 to a1 (radians), centred at (cx, cy).
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Point[] {
  return Array.from({ length: CURVE_POINTS }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / (CURVE_POINTS - 1)
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]
  })
}

function rawOutline(shape: Shape, w: number, h: number): Point[] {
  const inset = w * 0.2
  switch (shape) {
    case 'cylinder': {
      const ry = Math.min(h * 0.15, 14)
      return [
        ...arc(w / 2, ry, w / 2, ry, Math.PI, 2 * Math.PI), // top edge, left to right
        ...arc(w / 2, h - ry, w / 2, ry, 0, Math.PI), // right side down, bottom edge, back to the left
      ]
    }
    case 'document': {
      const wave = Math.min(h * 0.15, 10)
      const bottom: Point[] = Array.from({ length: CURVE_POINTS }, (_, i) => {
        const t = i / (CURVE_POINTS - 1)
        return [w * (1 - t), h - wave + wave * Math.sin(t * 2 * Math.PI)]
      })
      return [[0, 0], [w, 0], ...bottom]
    }
    case 'hexagon':
      return [[inset, 0], [w - inset, 0], [w, h / 2], [w - inset, h], [inset, h], [0, h / 2]]
    case 'parallelogram':
      return [[inset, 0], [w, 0], [w - inset, h], [0, h]]
    case 'trapezoid':
      return [[inset, 0], [w - inset, 0], [w, h], [0, h]]
    case 'triangle':
      return [[w / 2, 0], [w, h], [0, h]]
    case 'star':
      return Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? 1 : 0.4
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        return [w / 2 + (w / 2) * r * Math.cos(a), h / 2 + (h / 2) * r * Math.sin(a)]
      })
    default:
      return [[0, 0], [w, 0], [w, h], [0, h]]
  }
}

// Closed outline (first point = last) inside 0..width, 0..height. Used for shapes Excalidraw has no native type for.
export function outlinePoints(shape: Shape, width: number, height: number): Point[] {
  const pts = rawOutline(shape, width, height)
  return [...pts, [...pts[0]] as Point]
}
