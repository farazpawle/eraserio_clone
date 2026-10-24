import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileNameField from '@/app/(routes)/workspace/_components/FileNameField'

const mockToastError = jest.fn()
jest.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a) } }))

const setup = (props: Partial<React.ComponentProps<typeof FileNameField>> = {}) => {
  const onCommit = jest.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(<FileNameField name="Plan" editable onCommit={onCommit} {...props} />)
  return { onCommit, user }
}

const startEditing = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Plan' }))
  return screen.getByRole('textbox', { name: 'File name' })
}

describe('FileNameField', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows plain text, no input, when not editable', () => {
    setup({ editable: false })
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('limits the name to 200 characters', async () => {
    const { user } = setup()
    expect(await startEditing(user)).toHaveAttribute('maxlength', '200')
  })

  it('saves the trimmed name on Enter', async () => {
    const { user, onCommit } = setup()
    const input = await startEditing(user)

    await user.clear(input)
    await user.type(input, '  New name  {Enter}')

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('New name')
  })

  it('saves when the field loses focus', async () => {
    const { user, onCommit } = setup()
    const input = await startEditing(user)

    await user.clear(input)
    await user.type(input, 'Other')
    await user.tab()

    expect(onCommit).toHaveBeenCalledWith('Other')
  })

  it('does nothing when the name did not change', async () => {
    const { user, onCommit } = setup()
    await startEditing(user)
    await user.keyboard('{Enter}')

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('rejects an empty name and shows the old one again', async () => {
    const { user, onCommit } = setup()
    const input = await startEditing(user)

    await user.clear(input)
    await user.type(input, '   {Enter}')

    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
  })

  it('cancels on Escape', async () => {
    const { user, onCommit } = setup()
    const input = await startEditing(user)

    await user.type(input, 'xyz{Escape}')

    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
  })

  it('puts the old name back and shows a message when renaming fails', async () => {
    const onCommit = jest.fn().mockRejectedValue(new Error('No permission'))
    const { user } = setup({ onCommit })
    const input = await startEditing(user)

    await user.clear(input)
    await user.type(input, 'Other{Enter}')

    expect(mockToastError).toHaveBeenCalledWith('No permission')
    expect(await screen.findByRole('button', { name: 'Plan' })).toBeInTheDocument()
  })
})
