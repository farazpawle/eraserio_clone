import type { BinaryFileData } from '@excalidraw/excalidraw/types'
import type { Db } from '@/lib/data/db'
import { MAX_CANVAS_FILE_BYTES, sharedCanvasFileStore } from '@/lib/data/canvasFiles'
import { checkSharedUpload, readSharedCanvasFile, saveSharedCanvasFile } from '@/lib/data/sharedCanvasFiles'
import { fakeDb } from './fakeDb'

jest.mock('server-only', () => ({}))

const TOKEN = 'a'.repeat(64)
const FILE_ID = '11111111-1111-1111-1111-111111111111'

const share = (over: Record<string, unknown> = {}) => ({
  data: { permission: 'edit', expires_at: null, is_active: true, file: { id: FILE_ID, name: 'Plan', document: null, whiteboard: null }, ...over },
})

const png = (bytes = 8) => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

function setup(shareResult: ReturnType<typeof share> | { data: null }, storage: Record<string, jest.Mock> = {}) {
  const methods = {
    download: jest.fn().mockResolvedValue({ data: png(), error: null }),
    upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...storage,
  }
  const { db } = fakeDb(shareResult)
  const withStorage = Object.assign(db, { storage: { from: () => methods } }) as Db
  return { db: withStorage, ...methods }
}

describe('readSharedCanvasFile', () => {
  it('reads from the shared file’s own folder', async () => {
    const s = setup(share())
    const result = await readSharedCanvasFile(s.db, TOKEN, 'abc123')

    expect(result.status).toBe('ok')
    expect(s.download).toHaveBeenCalledWith(`${FILE_ID}/abc123`)
  })

  it('lets a view link read images', async () => {
    const s = setup(share({ permission: 'view' }))
    await expect(readSharedCanvasFile(s.db, TOKEN, 'abc')).resolves.toMatchObject({ status: 'ok' })
  })

  it.each(['../x', 'a/b', 'a'.repeat(65), '', 'a b', 'abc\n'])('refuses the key %j without touching storage', async (key) => {
    const s = setup(share())
    await expect(readSharedCanvasFile(s.db, TOKEN, key)).resolves.toEqual({ status: 'not_found' })
    expect(s.download).not.toHaveBeenCalled()
  })

  it('refuses a bad token, a revoked link and an expired link', async () => {
    const bad = setup(share())
    await expect(readSharedCanvasFile(bad.db, 'nope', 'abc')).resolves.toEqual({ status: 'not_found' })
    expect(bad.download).not.toHaveBeenCalled()

    const revoked = setup(share({ is_active: false }))
    await expect(readSharedCanvasFile(revoked.db, TOKEN, 'abc')).resolves.toEqual({ status: 'revoked' })

    const expired = setup(share({ expires_at: new Date(Date.now() - 1000).toISOString() }))
    await expect(readSharedCanvasFile(expired.db, TOKEN, 'abc')).resolves.toEqual({ status: 'expired' })
    expect(expired.download).not.toHaveBeenCalled()
  })

  it('reports a missing image as not found', async () => {
    const s = setup(share(), { download: jest.fn().mockResolvedValue({ data: null, error: { message: 'Object not found', statusCode: '404' } }) })
    await expect(readSharedCanvasFile(s.db, TOKEN, 'abc')).resolves.toEqual({ status: 'not_found' })
  })
})

describe('checkSharedUpload', () => {
  it('passes for an edit link', async () => {
    const s = setup(share())
    await expect(checkSharedUpload(s.db, TOKEN)).resolves.toBe('ok')
  })

  it.each([
    ['view', 'forbidden'],
    ['comment', 'forbidden'],
  ])('refuses a %s link as %s', async (permission, expected) => {
    const s = setup(share({ permission }))
    await expect(checkSharedUpload(s.db, TOKEN)).resolves.toBe(expected)
  })

  it('reports revoked, expired and unknown links', async () => {
    await expect(checkSharedUpload(setup(share({ is_active: false })).db, TOKEN)).resolves.toBe('revoked')
    await expect(
      checkSharedUpload(setup(share({ expires_at: new Date(Date.now() - 1000).toISOString() })).db, TOKEN)
    ).resolves.toBe('expired')
    await expect(checkSharedUpload(setup({ data: null }).db, TOKEN)).resolves.toBe('not_found')
  })
})

describe('saveSharedCanvasFile', () => {
  it.each(['view', 'comment'])('refuses a %s link and uploads nothing', async (permission) => {
    const s = setup(share({ permission }))
    await expect(saveSharedCanvasFile(s.db, TOKEN, 'abc', png())).resolves.toBe('forbidden')
    expect(s.upload).not.toHaveBeenCalled()
  })

  it('uploads for an edit link, into the shared file’s own folder', async () => {
    const s = setup(share())
    const blob = png()

    await expect(saveSharedCanvasFile(s.db, TOKEN, 'abc123', blob)).resolves.toBe('ok')
    expect(s.upload).toHaveBeenCalledWith(`${FILE_ID}/abc123`, blob, { contentType: 'image/png', upsert: false })
  })

  it('treats an image that already exists as saved', async () => {
    const s = setup(share(), { upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'The resource already exists', statusCode: '409' } }) })
    await expect(saveSharedCanvasFile(s.db, TOKEN, 'abc', png())).resolves.toBe('ok')
  })

  it('refuses a bad key, an unsupported type and an oversized image', async () => {
    const key = setup(share())
    await expect(saveSharedCanvasFile(key.db, TOKEN, '../x', png())).resolves.toBe('invalid')

    const type = setup(share())
    await expect(saveSharedCanvasFile(type.db, TOKEN, 'abc', new Blob(['x'], { type: 'text/html' }))).resolves.toBe('invalid')

    const big = setup(share())
    await expect(
      saveSharedCanvasFile(big.db, TOKEN, 'abc', png(MAX_CANVAS_FILE_BYTES + 1))
    ).resolves.toBe('too_large')

    expect(key.upload).not.toHaveBeenCalled()
    expect(type.upload).not.toHaveBeenCalled()
    expect(big.upload).not.toHaveBeenCalled()
  })

  it('reports a revoked or unknown link', async () => {
    const revoked = setup(share({ is_active: false }))
    await expect(saveSharedCanvasFile(revoked.db, TOKEN, 'abc', png())).resolves.toBe('revoked')
    const unknown = setup({ data: null })
    await expect(saveSharedCanvasFile(unknown.db, TOKEN, 'abc', png())).resolves.toBe('not_found')
  })
})

describe('sharedCanvasFileStore', () => {
  const file = { id: 'abc', mimeType: 'image/png', dataURL: 'data:image/png;base64,iVBORw0KGgo=', created: 1 } as BinaryFileData
  const response = (status: number, body: Partial<{ blob: Blob; json: unknown }> = {}) =>
    ({ ok: status < 400, status, blob: async () => body.blob, json: async () => body.json ?? {} }) as unknown as Response

  afterEach(() => jest.restoreAllMocks())

  it('loads images through the share route and skips missing ones', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response(200, { blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }) }))
      .mockResolvedValueOnce(response(404))
    global.fetch = fetchMock as unknown as typeof fetch

    const files = await sharedCanvasFileStore(TOKEN).load(['a', 'b'])

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([`/api/shared/${TOKEN}/files/a`, `/api/shared/${TOKEN}/files/b`])
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ id: 'a', mimeType: 'image/png', dataURL: file.dataURL })
  })

  it('throws when the route fails for another reason', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(500)) as unknown as typeof fetch
    await expect(sharedCanvasFileStore(TOKEN).load(['a'])).rejects.toThrow()
  })

  it('uploads with PUT and the image type', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response(200))
    global.fetch = fetchMock as unknown as typeof fetch

    await sharedCanvasFileStore(TOKEN).save(file)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/shared/${TOKEN}/files/abc`)
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('image/png')
    expect(init.body).toBeInstanceOf(Blob)
  })

  it('shows the route’s message when an upload is refused', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(413, { json: { error: 'Image is too large' } })) as unknown as typeof fetch
    await expect(sharedCanvasFileStore(TOKEN).save(file)).rejects.toThrow('Image is too large')
  })
})
