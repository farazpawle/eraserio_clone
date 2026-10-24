import React from 'react'
import { act, render } from '@testing-library/react'
import Editor from '@/app/(routes)/workspace/_components/Editor'

let mockConfigs: any[] = []
const mockEditorSave = jest.fn()
const mockDestroy = jest.fn()
const mockToastError = jest.fn()
const mockSaveDocument = jest.fn()

jest.mock('@editorjs/editorjs', () => ({
  __esModule: true,
  default: class {
    isReady = Promise.resolve()
    constructor(config: any) {
      mockConfigs.push(config)
    }
    save() {
      return mockEditorSave()
    }
    destroy() {
      mockDestroy()
    }
  },
}))
jest.mock('@editorjs/list', () => ({ __esModule: true, default: class {} }))
jest.mock('@editorjs/header', () => ({ __esModule: true, default: class {} }))
jest.mock('@editorjs/checklist', () => ({ __esModule: true, default: class {} }))
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
jest.mock('@/lib/data/files', () => ({ saveDocument: (...a: unknown[]) => mockSaveDocument(...a) }))
jest.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: jest.fn() } }))

const fileData = { id: 'f1', name: 'Plan', document: { blocks: [] }, whiteboard: null } as any
const flush = () => act(async () => {})

describe('Editor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfigs = []
    mockEditorSave.mockResolvedValue({ blocks: [] })
    mockSaveDocument.mockResolvedValue(undefined)
  })

  it('creates the editor once per file, not on every file data change', async () => {
    const view = render(<Editor fileId="f1" fileData={fileData} />)
    await flush()
    view.rerender(<Editor fileId="f1" fileData={{ ...fileData, name: 'Renamed' }} />)
    await flush()

    expect(mockConfigs).toHaveLength(1)
  })

  it('destroys the editor on unmount', async () => {
    const view = render(<Editor fileId="f1" fileData={fileData} />)
    await flush()
    view.unmount()

    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('saves once per save signal and reports the result', async () => {
    const onStatus = jest.fn()
    const view = render(<Editor fileId="f1" fileData={fileData} saveSignal={0} onStatus={onStatus} />)
    await flush()

    view.rerender(<Editor fileId="f1" fileData={fileData} saveSignal={1} onStatus={onStatus} />)
    await flush()
    expect(mockSaveDocument).toHaveBeenCalledTimes(1)
    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(['saving', 'saved'])

    view.rerender(<Editor fileId="f1" fileData={fileData} saveSignal={2} onStatus={onStatus} />)
    await flush()
    expect(mockSaveDocument).toHaveBeenCalledTimes(2)
  })

  it('reports error and shows a message when saving fails', async () => {
    mockSaveDocument.mockRejectedValue(new Error('No permission'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const onStatus = jest.fn()
    const view = render(<Editor fileId="f1" fileData={fileData} saveSignal={0} onStatus={onStatus} />)
    await flush()

    view.rerender(<Editor fileId="f1" fileData={fileData} saveSignal={1} onStatus={onStatus} />)
    await flush()

    expect(onStatus.mock.calls.map((c) => c[0])).toEqual(['saving', 'error'])
    expect(mockToastError).toHaveBeenCalledWith('No permission')
  })

  it('reports unsaved for edits made after the editor is ready', async () => {
    const onStatus = jest.fn()
    render(<Editor fileId="f1" fileData={fileData} onStatus={onStatus} />)

    mockConfigs[0].onChange() // before the editor is ready: ignored
    expect(onStatus).not.toHaveBeenCalled()

    await flush()
    mockConfigs[0].onChange()
    expect(onStatus).toHaveBeenCalledWith('unsaved')
  })

  it('does not report edits or save when read-only', async () => {
    const onStatus = jest.fn()
    const view = render(<Editor fileId="f1" fileData={fileData} readOnly onStatus={onStatus} saveSignal={0} />)
    await flush()
    mockConfigs[0].onChange?.()
    view.rerender(<Editor fileId="f1" fileData={fileData} readOnly onStatus={onStatus} saveSignal={1} />)
    await flush()

    expect(onStatus).not.toHaveBeenCalled()
    expect(mockSaveDocument).not.toHaveBeenCalled()
  })

  it('allows level 1 headings', async () => {
    render(<Editor fileId="f1" fileData={fileData} />)
    await flush()

    expect(mockConfigs[0].tools.header.config.levels).toEqual([1, 2, 3, 4])
  })
})
