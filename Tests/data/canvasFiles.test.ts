import type { BinaryFileData } from '@excalidraw/excalidraw/types'
import type { Db } from '@/lib/data/db'
import {
  CANVAS_BUCKET,
  MAX_CANVAS_FILE_BYTES,
  blobToDataUrl,
  dataUrlToBlob,
  deleteCanvasFiles,
  supabaseCanvasFileStore,
} from '@/lib/data/canvasFiles'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

const image = (over: Partial<BinaryFileData> = {}) =>
  ({ id: 'img1', mimeType: 'image/png', dataURL: PNG, created: 1, ...over }) as BinaryFileData

type Bucket = {
  upload: jest.Mock
  download: jest.Mock
  list: jest.Mock
  remove: jest.Mock
}

// Stand-in for db.storage: records the bucket asked for and answers from the jest mocks.
function fakeStorage(bucket: Partial<Bucket> = {}) {
  const used: string[] = []
  const methods: Bucket = {
    upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
    download: jest.fn(),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    ...bucket,
  }
  const db = { storage: { from: (name: string) => (used.push(name), methods) } } as unknown as Db
  return { db, used, ...methods }
}

describe('data URL helpers', () => {
  it('round-trips a data URL through a blob', async () => {
    const blob = dataUrlToBlob(PNG)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(8)
    await expect(blobToDataUrl(blob)).resolves.toBe(PNG)
  })
})

describe('supabaseCanvasFileStore.save', () => {
  it('uploads to <file id>/<image id> without overwriting', async () => {
    const s = fakeStorage()
    await supabaseCanvasFileStore(s.db, 'f1').save(image())

    expect(s.used).toEqual([CANVAS_BUCKET])
    expect(s.upload).toHaveBeenCalledWith('f1/img1', expect.any(Blob), { contentType: 'image/png', upsert: false })
  })

  it('treats "already exists" as success because image ids are content hashes', async () => {
    const s = fakeStorage({
      upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'The resource already exists', statusCode: '409' } }),
    })
    await expect(supabaseCanvasFileStore(s.db, 'f1').save(image())).resolves.toBeUndefined()
  })

  it('rejects other upload errors', async () => {
    const s = fakeStorage({
      upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy', statusCode: '403' } }),
    })
    await expect(supabaseCanvasFileStore(s.db, 'f1').save(image())).rejects.toThrow(/row-level security/)
  })

  it('rejects an image over the size limit before uploading', async () => {
    const s = fakeStorage()
    const big = image({ dataURL: `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_CANVAS_FILE_BYTES * 4) / 3) + 8)}` as BinaryFileData['dataURL'] })

    await expect(supabaseCanvasFileStore(s.db, 'f1').save(big)).rejects.toThrow(/too large/i)
    expect(s.upload).not.toHaveBeenCalled()
  })

  it('rejects an unsupported image type before uploading', async () => {
    const s = fakeStorage()
    const pdf = image({ mimeType: 'application/pdf' as BinaryFileData['mimeType'], dataURL: 'data:application/pdf;base64,JVBERi0=' as BinaryFileData['dataURL'] })

    await expect(supabaseCanvasFileStore(s.db, 'f1').save(pdf)).rejects.toThrow(/not supported/i)
    expect(s.upload).not.toHaveBeenCalled()
  })
})

describe('supabaseCanvasFileStore.load', () => {
  it('returns the images that exist and skips missing ones', async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })
    const s = fakeStorage({
      download: jest.fn((path: string) =>
        Promise.resolve(
          path === 'f1/a'
            ? { data: png, error: null }
            : { data: null, error: { message: 'Object not found', statusCode: '404' } }
        )
      ),
    })

    const files = await supabaseCanvasFileStore(s.db, 'f1').load(['a', 'b'])

    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ id: 'a', mimeType: 'image/png', dataURL: PNG })
  })

  it('throws on errors other than "not found"', async () => {
    const s = fakeStorage({
      download: jest.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch', statusCode: '500' } }),
    })
    await expect(supabaseCanvasFileStore(s.db, 'f1').load(['a'])).rejects.toThrow(/failed to fetch/i)
  })

  it('makes no storage call for an empty list', async () => {
    const s = fakeStorage()
    await expect(supabaseCanvasFileStore(s.db, 'f1').load([])).resolves.toEqual([])
    expect(s.used).toEqual([])
  })
})

describe('deleteCanvasFiles', () => {
  it('removes everything stored under the file id in one call', async () => {
    const s = fakeStorage({ list: jest.fn().mockResolvedValue({ data: [{ name: 'a' }, { name: 'b' }], error: null }) })
    await deleteCanvasFiles(s.db, 'f1')

    expect(s.list).toHaveBeenCalledWith('f1', expect.objectContaining({ limit: expect.any(Number) }))
    expect(s.remove).toHaveBeenCalledWith(['f1/a', 'f1/b'])
  })

  it('does nothing when there are no images', async () => {
    const s = fakeStorage()
    await deleteCanvasFiles(s.db, 'f1')
    expect(s.remove).not.toHaveBeenCalled()
  })
})
