import type { Tables } from '@/types/database'
import { type Db, DataError, unwrap } from './db'

export type Invitation = Tables<'team_invitations'>
export type InviteRole = 'admin' | 'member' | 'viewer'
export type MemberRole = 'owner' | InviteRole

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Owner/admin only (RLS). The returned row carries the token for the /invite link.
export async function sendInvitation(db: Db, teamId: string, email: string, role: InviteRole) {
  const normalised = email.trim().toLowerCase()
  if (!EMAIL.test(normalised)) throw new DataError('Enter a valid email address')

  const { data, error } = await db
    .from('team_invitations')
    .insert({ team_id: teamId, email: normalised, role })
    .select()
    .single()
  // One pending invitation per email per team (unique index).
  if (error?.code === '23505') throw new DataError('Invitation already sent to this email', error.code)
  return unwrap({ data, error })
}

export async function listInvitations(db: Db, teamId: string) {
  return unwrap(
    await db.from('team_invitations').select('*').eq('team_id', teamId).order('created_at', { ascending: false })
  )
}

export async function cancelInvitation(db: Db, id: string) {
  unwrap(await db.from('team_invitations').update({ status: 'cancelled' }).eq('id', id).select('id').single())
}

// The database function checks sign-in, email match, expiry and reuse. Returns the team id.
export async function acceptInvitation(db: Db, token: string) {
  return unwrap(await db.rpc('accept_invitation', { p_token: token }))
}

export async function listMembers(db: Db, teamId: string) {
  return unwrap(
    await db
      .from('team_members')
      .select('user_id, role, joined_at, profile:profiles!team_members_user_id_fkey(email, full_name, avatar_url)')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
  )
}

export type Member = NonNullable<Awaited<ReturnType<typeof listMembers>>>[number]

export async function removeMember(db: Db, teamId: string, userId: string) {
  unwrap(await db.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId).select('user_id').single())
}

export async function changeMemberRole(db: Db, teamId: string, userId: string, role: InviteRole) {
  unwrap(
    await db
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select('user_id')
      .single()
  )
}
