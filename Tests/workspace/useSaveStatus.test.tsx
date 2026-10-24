import { act, renderHook } from '@testing-library/react'
import { combineStatus, useSaveSignal, useSaveStatus } from '@/app/_hooks/useSaveStatus'

describe('combineStatus', () => {
  it('ranks error over saving over unsaved over saved', () => {
    expect(combineStatus({ doc: 'saved', canvas: 'saved' })).toBe('saved')
    expect(combineStatus({ doc: 'unsaved', canvas: 'saved' })).toBe('unsaved')
    expect(combineStatus({ doc: 'unsaved', canvas: 'saving' })).toBe('saving')
    expect(combineStatus({ doc: 'saved', canvas: 'error' })).toBe('error')
    expect(combineStatus({ doc: 'saving', canvas: 'error' })).toBe('error')
  })
})

describe('useSaveStatus', () => {
  it('starts saved and follows what the panes report', () => {
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current.status).toBe('saved')

    act(() => result.current.report('doc', 'unsaved'))
    expect(result.current.status).toBe('unsaved')

    act(() => result.current.report('doc', 'saved'))
    expect(result.current.status).toBe('saved')
  })

  it('stays unsaved until both panes are saved', () => {
    const { result } = renderHook(() => useSaveStatus())
    act(() => {
      result.current.report('doc', 'unsaved')
      result.current.report('canvas', 'unsaved')
    })
    act(() => result.current.report('doc', 'saved'))
    expect(result.current.status).toBe('unsaved')
  })
})

describe('useSaveSignal', () => {
  const setup = (signal: number | undefined, save: () => void) =>
    renderHook((props) => useSaveSignal(props.signal, props.save), { initialProps: { signal, save } })

  it('does not save on mount', () => {
    const save = jest.fn()
    setup(0, save)
    expect(save).not.toHaveBeenCalled()
  })

  it('saves once per signal change', () => {
    const save = jest.fn()
    const { rerender } = setup(0, save)

    rerender({ signal: 1, save })
    expect(save).toHaveBeenCalledTimes(1)

    rerender({ signal: 2, save })
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('does not save again when only the save callback changes', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { rerender } = setup(0, first)

    rerender({ signal: 1, save: first })
    rerender({ signal: 1, save: second })
    rerender({ signal: 1, save: jest.fn() })

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('calls the latest save callback when the signal changes', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { rerender } = setup(0, first)

    rerender({ signal: 0, save: second })
    rerender({ signal: 1, save: second })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('never saves without a signal', () => {
    const save = jest.fn()
    const { rerender } = setup(undefined, save)
    rerender({ signal: undefined, save: jest.fn() })
    expect(save).not.toHaveBeenCalled()
  })
})
