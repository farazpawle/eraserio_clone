import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportMenu from '@/app/(routes)/workspace/_components/ExportMenu'

const mockExportSingleFile = jest.fn()
const mockExportCanvas = jest.fn()

jest.mock('@/app/_context/ExportContext', () => ({
  useExportContext: () => ({ exportSingleFile: mockExportSingleFile, exportState: { isExporting: false } }),
}))
jest.mock('@/lib/canvas/export', () => ({ exportCanvas: (...a: unknown[]) => mockExportCanvas(...a) }))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

const file = { id: 'f1', name: 'Plan', document: { blocks: [] }, whiteboard: [] } as any
const scene = { elements: [{ id: 'e1', type: 'rectangle', isDeleted: false }], files: {} } as any

const open = async (getScene: () => unknown) => {
  const user = userEvent.setup()
  render(<ExportMenu file={file} getScene={getScene as any} />)
  await user.click(screen.getByRole('button', { name: 'Export' }))
  return user
}

describe('ExportMenu', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers the document as PDF and the canvas as PNG and SVG', async () => {
    await open(() => scene)

    expect(screen.getByRole('menuitem', { name: 'Document as PDF' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Canvas as PNG' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Canvas as SVG' })).toBeInTheDocument()
  })

  it('exports the document through the export context', async () => {
    const user = await open(() => scene)
    await user.click(screen.getByRole('menuitem', { name: 'Document as PDF' }))

    expect(mockExportSingleFile).toHaveBeenCalledWith(file, 'pdf')
  })

  it('exports the current canvas scene under the file name', async () => {
    const user = await open(() => scene)
    await user.click(screen.getByRole('menuitem', { name: 'Canvas as PNG' }))

    expect(mockExportCanvas).toHaveBeenCalledWith('png', scene, 'Plan')
  })

  it('disables the canvas items while the canvas has not loaded', async () => {
    await open(() => null)

    expect(screen.getByRole('menuitem', { name: 'Canvas as PNG' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Canvas as SVG' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Document as PDF' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('disables the canvas items when the canvas is empty', async () => {
    await open(() => ({ elements: [{ id: 'e1', type: 'rectangle', isDeleted: true }], files: {} }))

    expect(screen.getByRole('menuitem', { name: 'Canvas as SVG' })).toHaveAttribute('aria-disabled', 'true')
  })
})
