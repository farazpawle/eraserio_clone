export type DiagramType = 'flowchart' | 'cloud'
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
