export const DIAGRAM_TYPES = ['flowchart', 'cloud'] as const
export type DiagramType = (typeof DIAGRAM_TYPES)[number]
export type Direction = 'right' | 'down' | 'left' | 'up'
export type ColorMode = 'pastel' | 'bold' | 'outline'
export type StyleMode = 'plain' | 'shadow' | 'watercolor'
export type Typeface = 'rough' | 'clean' | 'mono'

export type DiagramSettings = {
  direction: Direction
  colorMode: ColorMode
  styleMode: StyleMode
  typeface: Typeface
  title?: string
}

export const DEFAULT_SETTINGS: DiagramSettings = {
  direction: 'right',
  colorMode: 'pastel',
  styleMode: 'plain',
  typeface: 'clean',
}

export type DiagramError = { line: number; message: string }
export type ParseResult<M> = { model: M; errors: DiagramError[] }

export const SHAPES = [
  'rectangle',
  'cylinder',
  'diamond',
  'document',
  'ellipse',
  'hexagon',
  'oval',
  'parallelogram',
  'star',
  'trapezoid',
  'triangle',
] as const
export type Shape = (typeof SHAPES)[number]

export const COLOR_NAMES = [
  'blue',
  'green',
  'red',
  'orange',
  'purple',
  'yellow',
  'teal',
  'pink',
  'gray',
] as const
export type ColorName = (typeof COLOR_NAMES)[number]

export type FlowNode = {
  id: string
  label: string
  shape: Shape
  color?: ColorName
  icon?: string
  parent?: string
  line: number
}
export type FlowGroup = {
  id: string
  label: string
  color?: ColorName
  icon?: string
  parent?: string
  line: number
}
export type EdgeKind = 'arrow' | 'both' | 'line' | 'dashed'
export type FlowEdge = { from: string; to: string; kind: EdgeKind; label?: string; line: number }
export type FlowModel = {
  settings: DiagramSettings
  nodes: FlowNode[]
  groups: FlowGroup[]
  edges: FlowEdge[]
}

export type Box = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }
// Absolute coordinates; the top-left of the whole diagram is 0,0.
export type PositionedFlow = {
  nodes: (FlowNode & Box)[]
  groups: (FlowGroup & Box)[]
  // ELK's right-angle route, first point on `from`, last on `to`.
  edges: (FlowEdge & { points: Point[] })[]
  width: number
  height: number
}

// Stored in a diagram frame's customData. Bump `version` only with a migration for old frames.
export type DiagramData = {
  kind: 'diagram'
  version: 1
  diagramId: string
  diagramType: DiagramType
  code: string
  settings: DiagramSettings
}
