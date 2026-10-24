import { generateExportFileName } from '@/lib/exportUtils'
import type { Scene } from './persist'

export type { Scene }
export type CanvasExportFormat = 'png' | 'svg'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Excalidraw is loaded on demand so the header does not pull it into the page bundle.
export async function exportCanvas(format: CanvasExportFormat, scene: Scene, fileName: string): Promise<void> {
  const { exportToCanvas, exportToSvg } = await import('@excalidraw/excalidraw')
  const name = generateExportFileName(fileName, format)
  // The scene keeps deleted elements (every diagram redraw leaves some); the export functions would draw them.
  const elements = scene.elements.filter((el) => !el.isDeleted)

  if (format === 'svg') {
    const svg = await exportToSvg({ elements, appState: {}, files: scene.files })
    download(new Blob([svg.outerHTML], { type: 'image/svg+xml' }), `${name}.svg`)
    return
  }

  const canvas = await exportToCanvas({
    elements,
    appState: {},
    files: scene.files,
    getDimensions: () => ({ width: 1920, height: 1080 }),
  })
  // Typed explicitly: 0.18's exportToCanvas resolves to `any` here (type-only @excalidraw/utils).
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b: Blob | null) => resolve(b), 'image/png', 0.9))
  if (!blob) throw new Error('Could not create the PNG')
  download(blob, `${name}.png`)
}
