import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { exportCanvas, type Scene } from '@/lib/canvas/export'

const mockExportToSvg = jest.fn()
const mockExportToCanvas = jest.fn()

jest.mock('@excalidraw/excalidraw', () => ({
  exportToSvg: (...args: unknown[]) => mockExportToSvg(...args),
  exportToCanvas: (...args: unknown[]) => mockExportToCanvas(...args),
}))

const scene: Scene = {
  elements: [{ id: 'e1', type: 'image', fileId: 'a', isDeleted: false }] as unknown as Scene['elements'],
  files: { a: { id: 'a', mimeType: 'image/png', dataURL: 'data:image/png;base64,AA==', created: 1 } } as unknown as BinaryFiles,
}

describe('exportCanvas', () => {
  let downloads: string[]

  beforeEach(() => {
    downloads = []
    mockExportToSvg.mockReset().mockResolvedValue({ outerHTML: '<svg></svg>' })
    mockExportToCanvas.mockReset().mockResolvedValue({ toBlob: (cb: (b: Blob) => void) => cb(new Blob(['png'])) })
    URL.createObjectURL = jest.fn(() => 'blob:x')
    URL.revokeObjectURL = jest.fn()
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
  })

  afterEach(() => jest.restoreAllMocks())

  it('passes the images to the SVG export so they are not dropped', async () => {
    await exportCanvas('svg', scene, 'My Plan')

    expect(mockExportToSvg).toHaveBeenCalledWith(expect.objectContaining({ elements: scene.elements, files: scene.files }))
    expect(downloads).toHaveLength(1)
    expect(downloads[0]).toMatch(/^My_Plan_\d{4}-\d{2}-\d{2}\.svg$/)
  })

  it('passes the images to the PNG export so they are not dropped', async () => {
    await exportCanvas('png', scene, 'My Plan')

    expect(mockExportToCanvas).toHaveBeenCalledWith(expect.objectContaining({ elements: scene.elements, files: scene.files }))
    expect(downloads[0]).toMatch(/^My_Plan_\d{4}-\d{2}-\d{2}\.png$/)
  })

  it('rejects when the PNG could not be produced', async () => {
    mockExportToCanvas.mockResolvedValue({ toBlob: (cb: (b: Blob | null) => void) => cb(null) })
    await expect(exportCanvas('png', scene, 'x')).rejects.toThrow(/png/i)
    expect(downloads).toHaveLength(0)
  })
})
