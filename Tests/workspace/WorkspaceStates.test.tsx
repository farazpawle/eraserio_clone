import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocEyebrow, WorkspaceError, WorkspaceSkeleton } from '@/app/(routes)/workspace/_components/WorkspaceStates'

const classesOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[class]')).map((el) => el.getAttribute('class')).join(' ')

describe('WorkspaceSkeleton', () => {
  it('keeps the loading texts and spinner, with skeleton blocks', () => {
    render(<WorkspaceSkeleton />)

    expect(screen.getByText('Loading your workspace...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we fetch your file data')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(3)
  })

  it('uses Graphite colours only', () => {
    const { container } = render(<WorkspaceSkeleton />)
    expect(classesOf(container)).not.toMatch(/bg-white|dark:bg-gray|text-gray-/)
  })
})

describe('WorkspaceError', () => {
  it('shows the message with Try Again and Go Back', () => {
    render(<WorkspaceError message="File not found." />)

    expect(screen.getByText('Failed to Load File')).toBeInTheDocument()
    expect(screen.getByText('File not found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
  })

  it('goes back in history', async () => {
    const back = jest.fn()
    Object.defineProperty(window, 'history', { value: { back }, writable: true })
    render(<WorkspaceError message="x" />)

    await userEvent.click(screen.getByRole('button', { name: 'Go Back' }))

    expect(back).toHaveBeenCalled()
  })

  it('uses Graphite colours only', () => {
    const { container } = render(<WorkspaceError message="x" />)
    expect(classesOf(container)).not.toMatch(/bg-white|dark:bg-gray|text-gray-|bg-blue-/)
  })
})

describe('DocEyebrow', () => {
  it('says when the document was last edited', () => {
    render(<DocEyebrow updatedAt={new Date(Date.now() - 3 * 60 * 1000).toISOString()} />)
    expect(screen.getByText('Document · edited 3 minutes ago')).toBeInTheDocument()
  })
})
