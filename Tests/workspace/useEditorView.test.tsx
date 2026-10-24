import { act, renderHook } from '@testing-library/react'
import { effectiveView, readStoredView, useEditorView } from '@/app/_hooks/useEditorView'

const KEY = 'draftboard:view:f1'

describe('readStoredView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => jest.restoreAllMocks())

  it('defaults to both when nothing is stored', () => {
    expect(readStoredView('f1')).toBe('both')
  })

  it('defaults to both when the stored value is junk', () => {
    localStorage.setItem(KEY, 'sideways')
    expect(readStoredView('f1')).toBe('both')
  })

  it('returns the stored view', () => {
    localStorage.setItem(KEY, 'canvas')
    expect(readStoredView('f1')).toBe('canvas')
  })

  it('defaults to both when storage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredView('f1')).toBe('both')
  })
})

describe('effectiveView', () => {
  it('turns both into doc on narrow screens only', () => {
    expect(effectiveView('both', true)).toBe('doc')
    expect(effectiveView('canvas', true)).toBe('canvas')
    expect(effectiveView('both', false)).toBe('both')
  })
})

describe('useEditorView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => jest.restoreAllMocks())

  it('stores the chosen view per file', () => {
    const { result } = renderHook(() => useEditorView('f1'))
    act(() => result.current.setView('doc'))
    expect(result.current.view).toBe('doc')
    expect(localStorage.getItem(KEY)).toBe('doc')
  })

  it('still switches when storage cannot be written', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useEditorView('f1'))
    expect(() => act(() => result.current.setView('doc'))).not.toThrow()
    expect(result.current.view).toBe('doc')
  })
})
