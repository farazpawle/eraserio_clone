import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileShareModal from '@/components/ui/file-share-modal'

const mockSendInvitation = jest.fn()
const mockCreateShareLink = jest.fn()
const mockListShares = jest.fn()
const mockRevokeShare = jest.fn()
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()

jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
jest.mock('@/lib/data/invitations', () => ({ sendInvitation: (...a: unknown[]) => mockSendInvitation(...a) }))
jest.mock('@/lib/data/shares', () => ({
  createShareLink: (...a: unknown[]) => mockCreateShareLink(...a),
  listShares: (...a: unknown[]) => mockListShares(...a),
  revokeShare: (...a: unknown[]) => mockRevokeShare(...a),
}))
jest.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => mockToastSuccess(...a), error: (...a: unknown[]) => mockToastError(...a) },
}))

const file = { id: 'f1', team_id: 't1', name: 'Plan' } as any
const link = (over = {}) => ({
  id: 's1',
  token: 'tok1',
  permission: 'view',
  expires_at: null,
  created_at: new Date().toISOString(),
  ...over,
})

const setup = async (props: Partial<React.ComponentProps<typeof FileShareModal>> = {}) => {
  const user = userEvent.setup()
  const write = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  render(<FileShareModal isOpen onClose={jest.fn()} file={file} teamName="Acme" {...props} />)
  await screen.findByRole('dialog')
  return { user, write }
}

describe('FileShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListShares.mockResolvedValue([])
    mockSendInvitation.mockResolvedValue({ token: 'invtok' })
    mockCreateShareLink.mockResolvedValue({})
    mockRevokeShare.mockResolvedValue(undefined)
  })

  it('renders nothing while closed', () => {
    render(<FileShareModal isOpen={false} onClose={jest.fn()} file={file} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('invite', () => {
    it('says the invited person joins the whole team', async () => {
      await setup()
      expect(screen.getByText(/join Acme and see every file in it/i)).toBeInTheDocument()
    })

    it('asks for an email before sending', async () => {
      const { user } = await setup()
      await user.click(screen.getByRole('button', { name: 'Invite' }))

      expect(screen.getByRole('alert')).toHaveTextContent('Enter an email address')
      expect(mockSendInvitation).not.toHaveBeenCalled()
    })

    it('invites as a viewer by default and copies the invitation link', async () => {
      const { user, write } = await setup()
      await user.type(screen.getByLabelText('Invite by email'), 'a@b.co')
      await user.click(screen.getByRole('button', { name: 'Invite' }))

      expect(mockSendInvitation).toHaveBeenCalledWith(expect.anything(), 't1', 'a@b.co', 'viewer')
      await waitFor(() => expect(write).toHaveBeenCalledWith(`${window.location.origin}/invite/invtok`))
      expect(mockToastSuccess).toHaveBeenCalled()
      expect(screen.getByLabelText('Invite by email')).toHaveValue('')
    })

    it('can invite as a member', async () => {
      const { user } = await setup()
      await user.type(screen.getByLabelText('Invite by email'), 'a@b.co')
      await user.selectOptions(screen.getByLabelText('Team role'), 'member')
      await user.click(screen.getByRole('button', { name: 'Invite' }))

      expect(mockSendInvitation).toHaveBeenCalledWith(expect.anything(), 't1', 'a@b.co', 'member')
    })

    it('shows the reason next to the field when the invitation fails', async () => {
      mockSendInvitation.mockRejectedValue(new Error('Invitation already sent to this email'))
      const { user } = await setup()
      await user.type(screen.getByLabelText('Invite by email'), 'a@b.co')
      await user.click(screen.getByRole('button', { name: 'Invite' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Invitation already sent to this email')
      expect(screen.getByLabelText('Invite by email')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('links', () => {
    it('lists active links and copies one', async () => {
      mockListShares.mockResolvedValue([link({ permission: 'edit' })])
      const { user, write } = await setup()

      const row = await screen.findByTestId('share-link-s1')
      expect(within(row).getByText('edit')).toBeInTheDocument()

      await user.click(within(row).getByRole('button', { name: 'Copy share link' }))
      expect(write).toHaveBeenCalledWith(`${window.location.origin}/shared/tok1`)
    })

    it('revokes a link', async () => {
      mockListShares.mockResolvedValue([link()])
      const { user } = await setup()

      await user.click(await screen.findByRole('button', { name: 'Revoke share link' }))

      expect(mockRevokeShare).toHaveBeenCalledWith(expect.anything(), 's1')
    })

    it('creates a link that never expires by default', async () => {
      const { user } = await setup()
      await user.selectOptions(screen.getByLabelText('Permission'), 'edit')
      await user.click(screen.getByRole('button', { name: 'Create link' }))

      expect(mockCreateShareLink).toHaveBeenCalledWith(expect.anything(), 'f1', 'edit', null)
    })

    it('creates a link with an expiry date', async () => {
      const { user } = await setup()
      await user.selectOptions(screen.getByLabelText('Expires'), '7')
      await user.click(screen.getByRole('button', { name: 'Create link' }))

      const expiresAt = mockCreateShareLink.mock.calls[0][3] as string
      const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000
      expect(days).toBeGreaterThan(6.9)
      expect(days).toBeLessThan(7.1)
    })

    it('keeps the dialog open and shows a message when creating fails', async () => {
      mockCreateShareLink.mockRejectedValue(new Error('Not allowed'))
      const { user } = await setup()
      await user.click(screen.getByRole('button', { name: 'Create link' }))

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Not allowed'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
