import type { BinaryFileData } from '@excalidraw/excalidraw/types'
import { type Db, DataError } from './db'

// Images pasted into a canvas live in a private bucket at "<file id>/<image id>".
// Excalidraw image ids are content hashes, so a stored image never changes.
export const CANVAS_BUCKET = 'canvas-files'
export const MAX_CANVAS_FILE_BYTES = 5 * 1024 * 1024
export const CANVAS_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
export const FILE_KEY = /^[A-Za-z0-9_-]{1,64}$/

// Where a pane gets its images from: Supabase for signed-in users, a server route for link holders.
export interface CanvasFileStore {
  load(ids: string[]): Promise<BinaryFileData[]>
  save(file: BinaryFileData): Promise<void>
}

type StorageErrorLike = { message: string; statusCode?: string | number; status?: number }

const isMissing = (e: StorageErrorLike) =>
  String(e.statusCode) === '404' || e.status === 404 || /not.?found/i.test(e.message)
const alreadyExists = (e: StorageErrorLike) => String(e.statusCode) === '409' || /already exists/i.test(e.message)

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s.exec(dataUrl)
  if (!match) throw new DataError('Image data is not valid')
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: match[1] })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new DataError('Could not read the image'))
    reader.readAsDataURL(blob)
  })
}

// Base64 is 4 characters per 3 bytes, so the size is known without decoding.
const approxBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)

export function supabaseCanvasFileStore(db: Db, fileId: string): CanvasFileStore {
  const bucket = () => db.storage.from(CANVAS_BUCKET)

  return {
    async save(file) {
      if (!CANVAS_MIME_TYPES.includes(file.mimeType)) throw new DataError('This image type is not supported')
      if (approxBytes(file.dataURL) > MAX_CANVAS_FILE_BYTES) throw new DataError('Image is too large (the limit is 5 MB)')

      const { error } = await bucket().upload(`${fileId}/${file.id}`, dataUrlToBlob(file.dataURL), {
        contentType: file.mimeType,
        upsert: false,
      })
      if (error && !alreadyExists(error)) throw new DataError(error.message)
    },

    async load(ids) {
      if (ids.length === 0) return []
      const loaded = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await bucket().download(`${fileId}/${id}`)
          if (error) {
            // A missing image leaves a placeholder on the canvas; anything else is a real failure.
            if (isMissing(error)) return null
            throw new DataError(error.message)
          }
          return {
            id,
            mimeType: data.type,
            dataURL: await blobToDataUrl(data),
            created: Date.now(),
          } as BinaryFileData
        })
      )
      return loaded.filter((f): f is BinaryFileData => f !== null)
    },
  }
}

export async function deleteCanvasFiles(db: Db, fileId: string): Promise<void> {
  const { data, error } = await db.storage.from(CANVAS_BUCKET).list(fileId, { limit: 1000 })
  if (error) throw new DataError(error.message)
  if (!data?.length) return
  const { error: removeError } = await db.storage.from(CANVAS_BUCKET).remove(data.map((o) => `${fileId}/${o.name}`))
  if (removeError) throw new DataError(removeError.message)
}
