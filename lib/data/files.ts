import type { Json, Tables } from '@/types/database'
import { type Db, requireName, unwrap } from './db'
import { deleteCanvasFiles } from './canvasFiles'

export type FileRow = Tables<'files'>
export type FileSummary = Omit<FileRow, 'document' | 'whiteboard'>

// Lists skip document/whiteboard: they can be large and the list never shows them.
const SUMMARY_COLUMNS = 'id, team_id, name, archived, created_by, created_at, updated_at'

export async function listFiles(db: Db, teamId: string): Promise<FileSummary[]> {
  const rows = unwrap(
    await db.from('files').select(SUMMARY_COLUMNS).eq('team_id', teamId).order('created_at', { ascending: false })
  )
  return rows ?? []
}

export async function getFile(db: Db, id: string) {
  return unwrap(await db.from('files').select('*').eq('id', id).maybeSingle())
}

export async function createFile(db: Db, teamId: string, name: string) {
  const fileName = requireName(name, 'File')
  return unwrap(await db.from('files').insert({ team_id: teamId, name: fileName }).select().single())
}

// RLS makes a blocked write (viewer, outsider) change 0 rows with no error;
// .single() on the returned id turns that into an error so saves are never silently lost.
async function updateFile(db: Db, id: string, patch: Partial<Pick<FileRow, 'name' | 'archived' | 'document' | 'whiteboard'>>) {
  unwrap(await db.from('files').update(patch).eq('id', id).select('id').single())
}

export const renameFile = async (db: Db, id: string, name: string) =>
  updateFile(db, id, { name: requireName(name, 'File') })
export const setFileArchived = (db: Db, id: string, archived: boolean) => updateFile(db, id, { archived })
export const saveDocument = (db: Db, id: string, document: Json) => updateFile(db, id, { document })
export const saveWhiteboard = (db: Db, id: string, whiteboard: Json) => updateFile(db, id, { whiteboard })

export async function deleteFile(db: Db, id: string) {
  unwrap(await db.from('files').delete().eq('id', id).select('id').single())
  // The row is gone; leftover images are only wasted space, so a failure here is not the user's problem.
  // ponytail: deleting a whole team still leaves its images behind; sweep them if storage grows.
  try {
    await deleteCanvasFiles(db, id)
  } catch (error) {
    console.warn('Could not remove canvas images for deleted file', { id, error })
  }
}
