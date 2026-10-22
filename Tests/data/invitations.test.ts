import {
  acceptInvitation,
  cancelInvitation,
  changeMemberRole,
  listInvitations,
  listMembers,
  removeMember,
  sendInvitation,
} from '@/lib/data/invitations'
import { fakeDb } from './fakeDb'

describe('invitations data', () => {
  it('sends an invitation with a normalised email and returns it (incl. token)', async () => {
    const row = { id: 'i1', token: 'abc' }
    const { db, calls } = fakeDb({ data: row })

    await expect(sendInvitation(db, 't1', ' Bob@Example.COM ', 'member')).resolves.toEqual(row)
    expect(calls[0]).toEqual([
      ['from', 'team_invitations'],
      ['insert', { team_id: 't1', email: 'bob@example.com', role: 'member' }],
      ['select'],
      ['single'],
    ])
  })

  it('rejects a malformed email without calling the database', async () => {
    const { db, calls } = fakeDb()
    await expect(sendInvitation(db, 't1', 'not-an-email', 'member')).rejects.toThrow('valid email')
    expect(calls).toHaveLength(0)
  })

  it('explains a duplicate pending invitation', async () => {
    const { db } = fakeDb({ error: { message: 'duplicate key', code: '23505' } })
    await expect(sendInvitation(db, 't1', 'bob@example.com', 'member')).rejects.toThrow(
      'Invitation already sent to this email'
    )
  })

  it('lists a team’s invitations newest first', async () => {
    const { db, calls } = fakeDb({ data: [] })

    await listInvitations(db, 't1')
    expect(calls[0]).toEqual([
      ['from', 'team_invitations'],
      ['select', '*'],
      ['eq', 'team_id', 't1'],
      ['order', 'created_at', { ascending: false }],
    ])
  })

  it('cancels by marking the invitation cancelled', async () => {
    const { db, calls } = fakeDb({ data: { id: 'i1' } })

    await cancelInvitation(db, 'i1')
    expect(calls[0]).toEqual([
      ['from', 'team_invitations'],
      ['update', { status: 'cancelled' }],
      ['eq', 'id', 'i1'],
      ['select', 'id'],
      ['single'],
    ])
  })

  it('accepts through the database function and returns the team id', async () => {
    const { db, calls } = fakeDb({ data: 't1' })

    await expect(acceptInvitation(db, 'tok')).resolves.toBe('t1')
    expect(calls[0]).toEqual([['rpc', 'accept_invitation', { p_token: 'tok' }]])
  })

  it('passes on the database refusal (wrong email, expired, used)', async () => {
    const { db } = fakeDb({ error: { message: 'Invitation expired', code: '22023' } })
    await expect(acceptInvitation(db, 'tok')).rejects.toThrow('Invitation expired')
  })

  it('lists members with their profile', async () => {
    const { db, calls } = fakeDb({ data: [] })

    await listMembers(db, 't1')
    expect(calls[0]).toEqual([
      ['from', 'team_members'],
      ['select', 'user_id, role, joined_at, profile:profiles!team_members_user_id_fkey(email, full_name, avatar_url)'],
      ['eq', 'team_id', 't1'],
      ['order', 'joined_at', { ascending: true }],
    ])
  })

  it('removes a member and changes a role by (team, user)', async () => {
    const { db, calls } = fakeDb({ data: { user_id: 'u2' } }, { data: { user_id: 'u2' } })

    await removeMember(db, 't1', 'u2')
    await changeMemberRole(db, 't1', 'u2', 'admin')
    const tail = [['eq', 'team_id', 't1'], ['eq', 'user_id', 'u2'], ['select', 'user_id'], ['single']]
    expect(calls[0]).toEqual([['from', 'team_members'], ['delete'], ...tail])
    expect(calls[1]).toEqual([['from', 'team_members'], ['update', { role: 'admin' }], ...tail])
  })
})
