import 'server-only'
import { type Db, DataError } from './db'
import { resolveShareToken } from './shares'
import {
  CANVAS_BUCKET,
  CANVAS_MIME_TYPES,
  FILE_KEY,
  MAX_CANVAS_FILE_BYTES,
  alreadyExists,
  isMissing,
} from './canvasFiles'

// Link holders are not signed in, and these run with the service-role client, which skips RLS.
// So every call re-checks the token and builds the storage path from the shared file's own id,
// never from anything the request says. Kept apart from canvasFiles.ts, which the browser imports.

type ShareFailure = 'not_found' | 'revoked' | 'expired'

export async function readSharedCanvasFile(
  db: Db,
  token: string,
  key: string
): Promise<{ status: 'ok'; blob: Blob } | { status: ShareFailure }> {
  const share = await resolveShareToken(db, token)
  if (share.status !== 'ok') return { status: share.status }
  if (!FILE_KEY.test(key)) return { status: 'not_found' }

  const { data, error } = await db.storage.from(CANVAS_BUCKET).download(`${share.file.id}/${key}`)
  if (error) {
    if (isMissing(error)) return { status: 'not_found' }
    throw new DataError(error.message)
  }
  return { status: 'ok', blob: data }
}

// Cheap gate the route runs before it reads an upload body into memory.
export async function checkSharedUpload(db: Db, token: string): Promise<'ok' | 'forbidden' | ShareFailure> {
  const share = await resolveShareToken(db, token)
  if (share.status !== 'ok') return share.status
  return share.permission === 'edit' ? 'ok' : 'forbidden'
}

export async function saveSharedCanvasFile(
  db: Db,
  token: string,
  key: string,
  blob: Blob
): Promise<'ok' | 'forbidden' | 'invalid' | 'too_large' | ShareFailure> {
  const share = await resolveShareToken(db, token)
  if (share.status !== 'ok') return share.status
  if (share.permission !== 'edit') return 'forbidden'
  if (!FILE_KEY.test(key) || !CANVAS_MIME_TYPES.includes(blob.type)) return 'invalid'
  if (blob.size > MAX_CANVAS_FILE_BYTES) return 'too_large'

  // ponytail: no per-file object count or rate limit, so an edit link could fill storage with
  // 5 MiB images; add a count check (list before upload) if links are shared with people you do not trust.
  const { error } = await db.storage
    .from(CANVAS_BUCKET)
    .upload(`${share.file.id}/${key}`, blob, { contentType: blob.type, upsert: false })
  if (error && !alreadyExists(error)) throw new DataError(error.message)
  return 'ok'
}
