import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Workspace from '@/app/(routes)/workspace/[fileId]/page'

let mockEditorProps: any
let mockCanvasProps: any
const mockGetFile = jest.fn()
const mockRenameFile = jest.fn()
const mockListMyTeams = jest.fn()
const mockRegisterShortcuts = jest.fn()

jest.mock('@/app/(routes)/workspace/_components/Editor', () => ({
  __esModule: true,
  default: (props: any) => {
    mockEditorProps = props
    return <div data-testid="editor" />
  },
}))
jest.mock('@/app/(routes)/workspace/_components/WSCanvas', () => ({
  __esModule: true,
  default: (props: any) => {
    mockCanvasProps = props
    return <div data-testid="ws-canvas" />
  },
}))
jest.mock('@/app/(routes)/workspace/_components/ExportMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/app/(routes)/workspace/_components/UserMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ui/file-share-modal', () => ({ __esModule: true, default: () => null }))
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
jest.mock('@/lib/data/files', () => ({
  getFile: (...a: unknown[]) => mockGetFile(...a),
  renameFile: (...a: unknown[]) => mockRenameFile(...a),
}))
jest.mock('@/lib/data/teams', () => ({ listMyTeams: (...a: unknown[]) => mockListMyTeams(...a) }))
jest.mock('@/hooks/useUser', () => ({ useUser: () => ({ user: { id: 'u1', email: 'a@b.co', name: 'A', avatarUrl: null } }) }))
jest.mock('@/app/_context/KeyboardShortcutsContext', () => ({
  useKeyboardShortcutsContext: () => ({
    registerShortcuts: mockRegisterShortcuts,
    unregisterShortcuts: jest.fn(),
    shortcutConfigs: [{ id: 'save', key: 's', altKey: true, description: 'Save file', category: 'File Operations' }],
  }),
}))
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

const fileRow = { id: 'f1', team_id: 't1', name: 'Plan', document: null, whiteboard: null } as any
const panel = (testId: string) => screen.getByTestId(testId).parentElement!.parentElement!

// The page re-registers shortcuts as state changes, so always use the latest call.
const shortcut = (key: string, altKey = true) =>
  mockRegisterShortcuts.mock.calls.at(-1)![0].find((s: any) => s.key === key && !!s.altKey === altKey)

const renderPage = async () => {
  render(<Workspace params={{ fileId: 'f1' }} />)
  await screen.findByTestId('editor')
  await screen.findByTestId('ws-canvas')
}

describe('Workspace page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockGetFile.mockResolvedValue(fileRow)
    mockRenameFile.mockResolvedValue(undefined)
    mockListMyTeams.mockResolvedValue([{ id: 't1', name: 'Acme' }])
  })

  it('shows the team name and the file name in the header', async () => {
    await renderPage()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
  })

  it('starts on Both and switches panes with the view tabs, keeping both mounted', async () => {
    const user = userEvent.setup()
    await renderPage()
    expect(panel('editor')).not.toHaveClass('hidden')
    expect(panel('ws-canvas')).not.toHaveClass('hidden')

    await user.click(screen.getByRole('tab', { name: 'Canvas' }))

    expect(panel('editor')).toHaveClass('hidden')
    expect(panel('ws-canvas')).not.toHaveClass('hidden')
    expect(screen.getByTestId('editor')).toBeInTheDocument()
    expect(localStorage.getItem('draftboard:view:f1')).toBe('canvas')
  })

  it('switches view with Alt+1, Alt+2 and Alt+3, even while typing', async () => {
    await renderPage()

    expect(shortcut('1').allowInInput).toBe(true)
    act(() => shortcut('1').action())
    expect(panel('ws-canvas')).toHaveClass('hidden')

    act(() => shortcut('3').action())
    expect(panel('editor')).toHaveClass('hidden')

    act(() => shortcut('2').action())
    expect(panel('editor')).not.toHaveClass('hidden')
    expect(panel('ws-canvas')).not.toHaveClass('hidden')
  })

  it('sends a new save signal to both panes for every save, from the button or the shortcut', async () => {
    const user = userEvent.setup()
    await renderPage()
    expect(mockEditorProps.saveSignal).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(mockEditorProps.saveSignal).toBe(1)
    expect(mockCanvasProps.saveSignal).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(mockEditorProps.saveSignal).toBe(2)

    act(() => shortcut('s').action())
    expect(mockCanvasProps.saveSignal).toBe(3)
  })

  it('shows what the panes report in the save status', async () => {
    await renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')

    act(() => mockEditorProps.onStatus('unsaved'))
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')

    act(() => mockCanvasProps.onStatus('error'))
    expect(screen.getByRole('status')).toHaveTextContent('Save failed')
  })

  it('renames the file and shows the new name without reloading the panes', async () => {
    const user = userEvent.setup()
    await renderPage()
    const editorIdBefore = mockEditorProps.fileData.id

    await user.click(screen.getByRole('button', { name: 'Plan' }))
    await user.clear(screen.getByRole('textbox', { name: 'File name' }))
    await user.type(screen.getByRole('textbox', { name: 'File name' }), 'Roadmap{Enter}')

    expect(mockRenameFile).toHaveBeenCalledWith(expect.anything(), 'f1', 'Roadmap')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Roadmap' })).toBeInTheDocument())
    expect(mockEditorProps.fileData.id).toBe(editorIdBefore)
  })

  it('gives the canvas a scene ref for exporting', async () => {
    await renderPage()
    expect(mockCanvasProps.sceneRef).toEqual({ current: null })
  })
})
