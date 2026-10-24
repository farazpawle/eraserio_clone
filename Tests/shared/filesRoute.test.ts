/**
 * @jest-environment node
 */
import { GET, PUT } from '@/app/api/shared/[token]/files/[key]/route'

const mockRead = jest.fn()
const mockSave = jest.fn()
const mockCheck = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ admin: true }) }))
jest.mock('server-only', () => ({}))
jest.mock('@/lib/data/sharedCanvasFiles', () => ({
  readSharedCanvasFile: (...a: unknown[]) => mockRead(...a),
  saveSharedCanvasFile: (...a: unknown[]) => mockSave(...a),
  checkSharedUpload: (...a: unknown[]) => mockCheck(...a),
}))

const params = { params: { token: 'tok', key: 'abc' } }
const MAX = 5 * 1024 * 1024

describe('GET /api/shared/[token]/files/[key]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends the image as a sandboxed, non-cacheable download', async () => {
    mockRead.mockResolvedValue({ status: 'ok', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/svg+xml' }) })

    const res = await GET(new Request('http://x'), params)

    expect(mockRead).toHaveBeenCalledWith({ admin: true }, 'tok', 'abc')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment/)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox")
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('never passes on a stored type outside the allow-list', async () => {
    mockRead.mockResolvedValue({ status: 'ok', blob: new Blob(['<script>'], { type: 'text/html' }) })
    const res = await GET(new Request('http://x'), params)
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
  })

  it.each([
    ['not_found', 404],
    ['revoked', 410],
    ['expired', 410],
  ])('answers %s with %i', async (status, code) => {
    mockRead.mockResolvedValue({ status })
    expect((await GET(new Request('http://x'), params)).status).toBe(code)
  })

  it('answers 500 when storage fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockRead.mockRejectedValue(new Error('boom'))
    expect((await GET(new Request('http://x'), params)).status).toBe(500)
  })
})

describe('PUT /api/shared/[token]/files/[key]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheck.mockResolvedValue('ok')
  })

  const put = (body: string | Uint8Array, headers: Record<string, string> = { 'content-type': 'image/png' }) =>
    new Request('http://x', { method: 'PUT', body: body as BodyInit, headers })

  it('hands the body and its type to the data layer', async () => {
    mockSave.mockResolvedValue('ok')

    const res = await PUT(put(new Uint8Array([1, 2, 3])), params)

    expect(res.status).toBe(200)
    const [db, token, key, blob] = mockSave.mock.calls[0]
    expect([db, token, key]).toEqual([{ admin: true }, 'tok', 'abc'])
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(3)
  })

  it('refuses an oversized body that sends no Content-Length (chunked)', async () => {
    const res = await PUT(put(new Uint8Array(MAX + 1)), params)

    expect(res.status).toBe(413)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it.each([
    ['forbidden', 403],
    ['revoked', 410],
    ['expired', 410],
    ['not_found', 404],
  ])('checks the link (%s) before reading the body', async (result, code) => {
    mockCheck.mockResolvedValue(result)
    const req = put(new Uint8Array([1, 2, 3]))
    const read = jest.spyOn(req, 'arrayBuffer')

    const res = await PUT(req, params)

    expect(res.status).toBe(code)
    expect(mockCheck).toHaveBeenCalledWith({ admin: true }, 'tok')
    expect(req.bodyUsed).toBe(false)
    expect(read).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('refuses a body that announces more than 5 MiB without reading it', async () => {
    const req = put('x', { 'content-type': 'image/png', 'content-length': String(MAX + 1) })
    const read = jest.spyOn(req, 'arrayBuffer')

    const res = await PUT(req, params)

    expect(res.status).toBe(413)
    expect(read).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it.each([
    ['forbidden', 403],
    ['invalid', 400],
    ['too_large', 413],
    ['not_found', 404],
    ['revoked', 410],
    ['expired', 410],
  ])('answers %s with %i', async (result, code) => {
    mockSave.mockResolvedValue(result)
    expect((await PUT(put('x'), params)).status).toBe(code)
  })
})
