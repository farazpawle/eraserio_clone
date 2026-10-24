import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import WSCanvas from '@/app/(routes)/workspace/_components/WSCanvas'
import { DEFAULT_SETTINGS } from '@/lib/diagram/types'

let mockProps: any
const mockLoadSceneFiles = jest.fn()
const mockPersistCanvas = jest.fn()
const mockToastError = jest.fn()
const mockLoadIconFiles = jest.fn()

jest.mock('@excalidraw/excalidraw', () => {
  const Passthrough = ({ children }: any) => children ?? null
  return {
    Excalidraw: (props: any) => {
      mockProps = props
      return <div data-testid="excalidraw">{props.renderTopRightUI?.(false, {})}</div>
    },
    CaptureUpdateAction: { IMMEDIATELY: 'IMMEDIATELY', NEVER: 'NEVER', EVENTUALLY: 'EVENTUALLY' },
    MainMenu: Object.assign(Passthrough, { DefaultItems: { ClearCanvas: () => null, ChangeCanvasBackground: () => null } }),
    WelcomeScreen: Object.assign(Passthrough, {
      Hints: { ToolbarHint: () => null },
      Center: Object.assign(Passthrough, { Logo: () => null, Heading: Passthrough, Menu: Passthrough, MenuItemHelp: () => null }),
    }),
    // Stand-in: the real one sums element versions too.
    getSceneVersion: (els: { version?: number }[]) => els.reduce((n, e) => n + (e.version ?? 0), 0),
  }
})
jest.mock('@/lib/diagram/icons/files', () => ({
  ...jest.requireActual('@/lib/diagram/icons/files'),
  loadIconFiles: (...a: unknown[]) => mockLoadIconFiles(...a),
}))
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

// jsdom has no layout; CodeMirror measures text with these.
const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => rect as DOMRect

const diagramFrame = (id: string, name: string, code: string) => ({
  id,
  type: 'frame',
  name,
  frameId: null,
  isDeleted: false,
  version: 1,
  customData: { kind: 'diagram', version: 1, diagramId: id, diagramType: 'flowchart', code, settings: DEFAULT_SETTINGS },
})

const mount = async (props: Record<string, unknown> = {}) => {
  const view = render(<WSCanvas fileId="f1" fileData={fileData} fileStore={store} {...props} />)
  await screen.findByTestId('excalidraw')
  return view
}

const change = (version: number, fileMap = files) =>
  act(() => mockProps.onChange([element(version)], { selectedElementIds: {} }, fileMap))

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

  describe('icons', () => {
    const iconElement = { id: 'i1', type: 'image', fileId: 'icon:aws-ec2', isDeleted: false, version: 1 }
    const iconFile = { id: 'icon:aws-ec2', mimeType: 'image/svg+xml', dataURL: 'data:image/svg+xml;base64,AA==', created: 1 }

    it('adds the missing icon file once, however many changes report it', async () => {
      mockLoadIconFiles.mockResolvedValue([iconFile])
      const api = { addFiles: jest.fn(), getSceneElements: () => [], getSceneElementsIncludingDeleted: () => [] }
      await mount()
      act(() => mockProps.excalidrawAPI(api))

      await act(async () => mockProps.onChange([iconElement], { selectedElementIds: {} }, {}))
      await act(async () => mockProps.onChange([{ ...iconElement, version: 2 }], { selectedElementIds: {} }, {}))

      expect(mockLoadIconFiles).toHaveBeenCalledTimes(1)
      expect(mockLoadIconFiles).toHaveBeenCalledWith(['aws-ec2'])
      expect(api.addFiles).toHaveBeenCalledTimes(1)
      expect(api.addFiles).toHaveBeenCalledWith([iconFile])
    })

    it('loads nothing when the canvas has no icons or the file is already there', async () => {
      const api = { addFiles: jest.fn(), getSceneElements: () => [], getSceneElementsIncludingDeleted: () => [] }
      await mount()
      act(() => mockProps.excalidrawAPI(api))

      await act(async () => mockProps.onChange([element(1)], { selectedElementIds: {} }, files))
      await act(async () => mockProps.onChange([iconElement], { selectedElementIds: {} }, { 'icon:aws-ec2': iconFile }))

      expect(mockLoadIconFiles).not.toHaveBeenCalled()
    })
  })

  describe('diagrams', () => {
    const withDiagrams = (...frames: ReturnType<typeof diagramFrame>[]) => {
      const whiteboard = [element(1), ...frames]
      const api = { getSceneElements: () => whiteboard, getSceneElementsIncludingDeleted: () => whiteboard }
      return { data: { ...fileData, id: `f-${frames.length}`, whiteboard }, api }
    }
    const mountWith = async (frames: ReturnType<typeof diagramFrame>[], props: Record<string, unknown> = {}) => {
      const { data, api } = withDiagrams(...frames)
      const view = await mount({ fileData: data, ...props })
      act(() => mockProps.excalidrawAPI(api))
      return view
    }

    it('offers a Diagram button to editors, plus an icon button for phones', async () => {
      await mount()

      expect(screen.getByRole('button', { name: 'Diagram' })).toBeInTheDocument()
      // CSS shows only one of the two: the text button from 768px up, the icon button below.
      expect(screen.getByRole('button', { name: 'Insert diagram' })).toHaveClass('md:hidden')
      expect(screen.queryByRole('button', { name: 'Diagram code' })).not.toBeInTheDocument()
    })

    it('gives viewers no Diagram button, and no code button without diagrams', async () => {
      await mountWith([], { readOnly: true })

      expect(screen.queryByRole('button', { name: 'Diagram' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Insert diagram' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Diagram code' })).not.toBeInTheDocument()
    })

    it('lets viewers read a diagram code, read-only, and returns focus to the canvas on close', async () => {
      const user = userEvent.setup()
      await mountWith([diagramFrame('d1', 'Checkout', 'Cart > Pay')], { readOnly: true })

      await user.click(screen.getByRole('button', { name: 'Diagram code' }))

      const panel = screen.getByRole('complementary', { name: 'Diagram code' })
      expect(panel).toHaveTextContent('Cart > Pay')
      expect(panel.querySelector('.cm-content')).toHaveAttribute('contenteditable', 'false')
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Hide diagram code' }))
      expect(screen.queryByRole('complementary', { name: 'Diagram code' })).not.toBeInTheDocument()
      expect(document.activeElement).toBe(screen.getByTestId('canvas'))
    })

    it('lets viewers pick between several diagrams by name', async () => {
      const user = userEvent.setup()
      await mountWith([diagramFrame('d1', 'Checkout', 'Cart > Pay'), diagramFrame('d2', 'Login', 'User > Auth')], {
        readOnly: true,
      })
      await user.click(screen.getByRole('button', { name: 'Diagram code' }))

      await user.selectOptions(screen.getByRole('combobox', { name: 'Diagram' }), 'Login')

      expect(screen.getByRole('complementary', { name: 'Diagram code' })).toHaveTextContent('User > Auth')
    })

    it('numbers diagrams whose names repeat or are empty', async () => {
      const user = userEvent.setup()
      await mountWith(
        [diagramFrame('d1', 'Flow', 'A > B'), diagramFrame('d2', 'Flow', 'C > D'), diagramFrame('d3', '', 'E > F'), diagramFrame('d4', 'Login', 'G > H')],
        { readOnly: true }
      )
      await user.click(screen.getByRole('button', { name: 'Diagram code' }))

      const names = screen.getAllByRole('option').map((o) => o.textContent)
      expect(names).toEqual(['Flow 1', 'Flow 2', 'Diagram 3', 'Login'])
    })
  })
})
