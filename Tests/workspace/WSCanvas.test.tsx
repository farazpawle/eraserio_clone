import React from 'react'
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import WSCanvas from '@/app/(routes)/workspace/_components/WSCanvas'

let mockProps: any
const mockLoadSceneFiles = jest.fn()
const mockPersistCanvas = jest.fn()
const mockToastError = jest.fn()

jest.mock('@excalidraw/excalidraw', () => {
  const Passthrough = ({ children }: any) => children ?? null
  return {
    Excalidraw: (props: any) => {
      mockProps = props
      return <div data-testid="excalidraw" />
    },
    MainMenu: Object.assign(Passthrough, { DefaultItems: { ClearCanvas: () => null, ChangeCanvasBackground: () => null } }),
    WelcomeScreen: Object.assign(Passthrough, {
      Hints: { ToolbarHint: () => null },
      Center: Object.assign(Passthrough, { Logo: () => null, Heading: Passthrough, Menu: Passthrough, MenuItemHelp: () => null }),
    }),
    // Stand-in: the real one sums element versions too.
    getSceneVersion: (els: { version?: number }[]) => els.reduce((n, e) => n + (e.version ?? 0), 0),
  }
})
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
jest.mock('@/lib/data/files', () => ({ saveWhiteboard: jest.fn() }))
jest.mock('@/lib/data/canvasFiles', () => ({ supabaseCanvasFileStore: () => ({ load: jest.fn(), save: jest.fn() }) }))
jest.mock('@/lib/canvas/persist', () => ({
  loadSceneFiles: (...a: unknown[]) => mockLoadSceneFiles(...a),
  persistCanvas: (...a: unknown[]) => mockPersistCanvas(...a),
}))
jest.mock('@/app/_context/ThemeContext', () => ({ useTheme: () => ({ actualTheme: 'dark' }) }))
jest.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: jest.fn(), info: jest.fn() } }))

const element = (version: number) => ({ id: 'e1', type: 'image', fileId: 'a', isDeleted: false, version })
const fileData = { id: 'f1', name: 'Plan', document: null, whiteboard: [element(1)] } as any
const files = { a: { id: 'a' } }
const store = { load: jest.fn(), save: jest.fn() }

const mount = async (props: Record<string, unknown> = {}) => {
  const view = render(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} {...props} />)
  await screen.findByTestId('excalidraw')
  return view
}

const change = (version: number, fileMap = files) =>
  act(() => mockProps.onChange([element(version)], {}, fileMap))

describe('WSCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadSceneFiles.mockResolvedValue(files)
    mockPersistCanvas.mockResolvedValue(undefined)
  })

  it('loads the stored images before mounting the canvas', async () => {
    await mount()

    expect(mockLoadSceneFiles).toHaveBeenCalledWith(expect.objectContaining({ store }), fileData.whiteboard)
    expect(mockProps.initialData.files).toBe(files)
    expect(mockProps.initialData.elements).toBe(fileData.whiteboard)
  })

  it('still opens the canvas, with a message, when the images cannot be loaded', async () => {
    mockLoadSceneFiles.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await mount()

    expect(mockToastError).toHaveBeenCalled()
    expect(mockProps.initialData.files).toEqual({})
  })

  it('keeps the latest elements and images in sceneRef', async () => {
    const sceneRef = { current: null as any }
    await mount({ sceneRef })

    change(2)

    expect(sceneRef.current.elements).toEqual([element(2)])
    expect(sceneRef.current.files).toBe(files)
  })

  it('saves the elements and the images together, once per save signal', async () => {
    const onSave = jest.fn()
    const view = await mount({ saveSignal: 0, onSave })
    change(1)
    change(2)

    view.rerender(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} saveSignal={1} onSave={onSave} />)
    await act(async () => {})

    expect(mockPersistCanvas).toHaveBeenCalledTimes(1)
    const [deps, scene] = mockPersistCanvas.mock.calls[0]
    expect(deps.store).toBe(store)
    expect(deps.saveElements).toBe(onSave)
    expect(scene.elements).toEqual([element(2)])
    expect(scene.files).toBe(files)

    // New edits do not trigger another save; only a new signal does.
    change(3)
    await act(async () => {})
    expect(mockPersistCanvas).toHaveBeenCalledTimes(1)
  })

  it('reports saving then saved, and error when the save fails', async () => {
    const onStatus = jest.fn()
    const view = await mount({ saveSignal: 0, onStatus })
    change(1)

    view.rerender(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} saveSignal={1} onStatus={onStatus} />)
    await act(async () => {})
    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(['saving', 'saved'])

    onStatus.mockClear()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockPersistCanvas.mockRejectedValue(new Error('Image is too large'))
    view.rerender(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} saveSignal={2} onStatus={onStatus} />)
    await act(async () => {})

    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(['saving', 'error'])
    expect(mockToastError).toHaveBeenCalledWith('Image is too large')
  })

  it('reports unsaved only for changes after the canvas opened', async () => {
    const onStatus = jest.fn()
    await mount({ onStatus })

    change(1) // Excalidraw's first onChange after load is the baseline, not an edit.
    expect(onStatus).not.toHaveBeenCalled()

    change(2)
    expect(onStatus).toHaveBeenCalledWith('unsaved')
  })

  it('never reports unsaved or saves for a read-only canvas', async () => {
    const onStatus = jest.fn()
    const view = await mount({ readOnly: true, onStatus, saveSignal: 0 })
    change(1)
    change(2)
    view.rerender(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} readOnly onStatus={onStatus} saveSignal={1} />)
    await act(async () => {})

    expect(onStatus).not.toHaveBeenCalled()
    expect(mockPersistCanvas).not.toHaveBeenCalled()
  })
})
