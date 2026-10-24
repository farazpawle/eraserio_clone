import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import DiagramCodePanel from '@/app/(routes)/workspace/_components/diagram/DiagramCodePanel'
import type { DiagramError } from '@/lib/diagram/types'

// jsdom has no layout; CodeMirror measures text with these.
const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => rect as DOMRect

function setup(props: Partial<React.ComponentProps<typeof DiagramCodePanel>> = {}) {
  const onChange = jest.fn()
  const onClose = jest.fn()
  const utils = render(
    <DiagramCodePanel
      code="A > B"
      errors={[]}
      nodeNames={['A', 'B']}
      readOnly={false}
      onChange={onChange}
      onClose={onClose}
      {...props}
    />
  )
  const view = EditorView.findFromDOM(utils.container.querySelector('.cm-editor') as HTMLElement)!
  const typeAtEnd = (text: string) =>
    act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: text } }))
  return { ...utils, view, onChange, onClose, typeAtEnd }
}

describe('DiagramCodePanel', () => {
  afterEach(() => jest.useRealTimers())

  it('is a labelled complementary region that shows the code', () => {
    const { view } = setup()

    expect(screen.getByRole('complementary', { name: 'Diagram code' })).toBeInTheDocument()
    expect(view.state.doc.toString()).toBe('A > B')
    expect(screen.getByText('Diagram up to date')).toBeInTheDocument()
  })

  it('keeps the cursor line up to date for the icon picker', () => {
    const cursorLine = { current: 99 }
    const { view } = setup({ code: 'A\nB\nC', cursorLine })
    expect(cursorLine.current).toBe(1)

    act(() => view.dispatch({ selection: { anchor: view.state.doc.line(3).from } }))
    expect(cursorLine.current).toBe(3)
  })

  it('reports typing once, 150 ms after the last key', () => {
    jest.useFakeTimers()
    const { onChange, typeAtEnd } = setup()

    typeAtEnd('\nC')
    act(() => void jest.advanceTimersByTime(100))
    typeAtEnd('D')
    act(() => void jest.advanceTimersByTime(149))
    expect(onChange).not.toHaveBeenCalled()

    act(() => void jest.advanceTimersByTime(1))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('A > B\nCD')
  })

  it('reports typing still waiting for its 150 ms when the panel closes', () => {
    jest.useFakeTimers()
    const { onChange, typeAtEnd, unmount } = setup()

    typeAtEnd('\nC')
    act(() => void jest.advanceTimersByTime(50))
    unmount()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('A > B\nC')
    act(() => void jest.advanceTimersByTime(500))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does not report on close when nothing is waiting', () => {
    const { onChange, unmount } = setup()
    unmount()
    expect(onChange).not.toHaveBeenCalled()
  })

  // A live region is announced when its text changes in the DOM; a redraw with the same result must not touch it.
  it('leaves the status text alone when a redraw gives the same footer', () => {
    const { rerender, onChange, onClose } = setup()
    const status = screen.getByRole('status')
    const changes: MutationRecord[] = []
    const observer = new MutationObserver((records) => changes.push(...records))
    observer.observe(status, { childList: true, characterData: true, subtree: true })

    rerender(
      <DiagramCodePanel code="A > B" errors={[]} nodeNames={['A', 'B']} readOnly={false} onChange={onChange} onClose={onClose} />
    )

    return Promise.resolve().then(() => {
      observer.disconnect()
      expect(changes).toEqual([])
      expect(screen.getByRole('status')).toBe(status)
    })
  })

  it('replaces the text without reporting when the code prop changes', () => {
    jest.useFakeTimers()
    const { view, onChange, rerender } = setup()

    rerender(
      <DiagramCodePanel code="X > Y" errors={[]} nodeNames={[]} readOnly={false} onChange={onChange} onClose={jest.fn()} />
    )
    act(() => void jest.advanceTimersByTime(500))

    expect(view.state.doc.toString()).toBe('X > Y')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not let a pending keystroke overwrite a newer code prop', () => {
    jest.useFakeTimers()
    const { view, onChange, typeAtEnd, rerender } = setup()

    typeAtEnd('\nC')
    rerender(
      <DiagramCodePanel code="X > Y" errors={[]} nodeNames={[]} readOnly={false} onChange={onChange} onClose={jest.fn()} />
    )
    act(() => void jest.advanceTimersByTime(150))

    expect(onChange).not.toHaveBeenCalled()
    expect(view.state.doc.toString()).toBe('X > Y')
  })

  it('becomes read-only when the prop changes after mount', () => {
    const { view, onChange, rerender } = setup()
    expect(view.contentDOM).toHaveAttribute('contenteditable', 'true')

    rerender(
      <DiagramCodePanel code="A > B" errors={[]} nodeNames={[]} readOnly onChange={onChange} onClose={jest.fn()} />
    )

    expect(view.contentDOM).toHaveAttribute('contenteditable', 'false')
  })

  it('is not editable when read-only but still shows the code', () => {
    const { view } = setup({ readOnly: true })

    expect(view.contentDOM).toHaveAttribute('contenteditable', 'false')
    expect(view.state.doc.toString()).toBe('A > B')
  })

  it('closes with the button and with Escape', async () => {
    const user = userEvent.setup()
    const { view, onClose } = setup()

    await user.click(screen.getByRole('button', { name: 'Hide diagram code' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    view.focus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows the first error with a count of the rest', () => {
    const errors: DiagramError[] = [
      { line: 3, message: 'Unknown shape.' },
      { line: 4, message: 'Missing name.' },
      { line: 0, message: 'General.' },
    ]
    setup({ code: 'A\nB\nC\nD', errors })

    expect(screen.getByText('Line 3: Unknown shape. (+2 more)')).toBeInTheDocument()
  })

  it('shows a line-less error as just the message', () => {
    setup({ errors: [{ line: 0, message: 'Too many nodes.' }] })

    expect(screen.getByText('Too many nodes.')).toBeInTheDocument()
  })

  it('links to the syntax help in a new tab', () => {
    setup()

    const link = screen.getByRole('link', { name: 'Syntax help' })
    expect(link).toHaveAttribute('href', '/help/diagram-syntax')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the header slot under the "Diagram code" heading', () => {
    setup({ header: <span>Style bar</span> })

    expect(screen.getByRole('heading', { name: 'Diagram code' })).toBeInTheDocument()
    expect(screen.getByText('Style bar')).toBeInTheDocument()
  })
})
