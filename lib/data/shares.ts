import type { Json, Tables } from '@/types/database'
import { type Db, unwrap } from './db'

export type Share = Tables<'file_shares'>
export type SharePermission = 'view' | 'comment' | 'edit'
export type SharedFile = Pick<Tables<'files'>, 'id' | 'name' | 'document' | 'whiteboard'>
export type ResolvedShare =
  | { status: 'ok'; permission: SharePermission; file: SharedFile }
  | { status: 'not_found' | 'revoked' | 'expired' }

// Tokens are 32 random bytes as hex (database default).
const TOKEN = /^[0-9a-f]{64}$/

// --- Owner/admin side (RLS-checked, user's own client) ---

export async function createShareLink(db: Db, fileId: string, permission: SharePermission, expiresAt: string | null) {
  return unwrap(
    await db.from('file_shares').insert({ file_id: fileId, permission, expires_at: expiresAt }).select().single()
  )
}

export async function listShares(db: Db, fileId: string) {
  return unwrap(
    await db
      .from('file_shares')
      .select('*')
      .eq('file_id', fileId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
  )
}

export async function revokeShare(db: Db, id: string) {
  unwrap(await db.from('file_shares').update({ is_active: false }).eq('id', id).select('id').single())
}

// --- Link-holder side: server only, called with the service-role client ---
// The token is the only credential, so every call re-checks it here.

export async function resolveShareToken(db: Db, token: string, now = new Date()): Promise<ResolvedShare> {
  if (!TOKEN.test(token)) return { status: 'not_found' }

  const share = unwrap(
    await db
      .from('file_shares')
      .select('permission, expires_at, is_active, file:files(id, name, document, whiteboard)')
      .eq('token', token)
      .maybeSingle()
  )
  if (!share?.file) return { status: 'not_found' }
  if (!share.is_active) return { status: 'revoked' }
  if (share.expires_at && new Date(share.expires_at) <= now) return { status: 'expired' }
  return { status: 'ok', permission: share.permission as SharePermission, file: share.file }
}

export async function saveSharedFile(
  db: Db,
  token: string,
  content: { document?: Json; whiteboard?: Json },
  now = new Date()
): Promise<'ok' | 'forbidden' | Exclude<ResolvedShare['status'], 'ok'>> {
  const share = await resolveShareToken(db, token, now)
  if (share.status !== 'ok') return share.status
  if (share.permission !== 'edit') return 'forbidden'

  // Copy only the content columns; never trust the request body's other keys.
  const patch: { document?: Json; whiteboard?: Json } = {}
  if (content.document !== undefined) patch.document = content.document
  if (content.whiteboard !== undefined) patch.whiteboard = content.whiteboard

  unwrap(await db.from('files').update(patch).eq('id', share.file.id).select('id').single())
  return 'ok'
}
