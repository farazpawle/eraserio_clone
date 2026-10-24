import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WSHeader from '@/app/(routes)/workspace/_components/WSHeader'

jest.mock('@/app/(routes)/workspace/_components/ExportMenu', () => ({ __esModule: true, default: () => <div data-testid="export-menu" /> }))
jest.mock('@/app/(routes)/workspace/_components/UserMenu', () => ({ __esModule: true, default: () => <div data-testid="user-menu" /> }))
jest.mock('@/components/ui/file-share-modal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="share-modal" /> : null),
}))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

const file = { id: 'f1', name: 'Plan', team_id: 't1', document: null, whiteboard: null } as any

const setup = (props: Partial<React.ComponentProps<typeof WSHeader>> = {}) => {
  const handlers = { onViewChange: jest.fn(), onSave: jest.fn(), onRename: jest.fn().mockResolvedValue(undefined) }
  render(
    <WSHeader
      fileName="Plan"
      teamName="Acme"
      fileData={file}
      view="both"
      narrow={false}
      status="saved"
      getScene={() => null}
      user={{ id: 'u1', email: 'a@b.co', name: 'A', avatarUrl: null }}
      {...handlers}
      {...props}
    />
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('WSHeader', () => {
  it('links the logo to the dashboard', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('shows the team name, then the editable file name', () => {
    setup()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
  })

  it('renames through onRename', async () => {
    const { user, onRename } = setup()
    await user.click(screen.getByRole('button', { name: 'Plan' }))
    await user.type(screen.getByRole('textbox', { name: 'File name' }), ' v2{Enter}')

    expect(onRename).toHaveBeenCalledWith('Plan v2')
  })

  it('reports the chosen view', async () => {
    const { user, onViewChange } = setup()
    await user.click(screen.getByRole('tab', { name: 'Canvas' }))
    expect(onViewChange).toHaveBeenCalledWith('canvas')
  })

  it.each([
    ['saved', 'Saved'],
    ['unsaved', 'Unsaved changes'],
    ['saving', 'Saving…'],
    ['error', 'Save failed'],
  ] as const)('shows %s as "%s" in a polite live region', (status, label) => {
    setup({ status })
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })

  it('saves from the Save button', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('opens the share dialog', async () => {
    const { user } = setup()
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByTestId('share-modal')).toBeInTheDocument()
  })

  it('shows export and the user menu for a signed-in editor', () => {
    setup()
    expect(screen.getByTestId('export-menu')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })

  it('hides save, status, rename, share and export when read-only', () => {
    setup({ readOnly: true })

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Plan' })).not.toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('export-menu')).not.toBeInTheDocument()
  })

  it('has no share or export for a link holder (no file data), but keeps Save for edit links', () => {
    setup({ fileData: undefined, onRename: undefined })

    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('export-menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Plan' })).not.toBeInTheDocument()
  })
})
