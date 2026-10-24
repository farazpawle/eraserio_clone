import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CANVAS_MIME_TYPES, MAX_CANVAS_FILE_BYTES } from '@/lib/data/canvasFiles'
import { checkSharedUpload, readSharedCanvasFile, saveSharedCanvasFile } from '@/lib/data/sharedCanvasFiles'

const STATUS = { forbidden: 403, invalid: 400, too_large: 413, not_found: 404, revoked: 410, expired: 410 } as const
const MESSAGE = {
  forbidden: 'This link cannot make changes',
  invalid: 'Unsupported image',
  too_large: 'Image is too large (the limit is 5 MB)',
  not_found: 'Not found',
  revoked: 'This share link has been revoked',
  expired: 'This share link has expired',
} as const

const refuse = (reason: keyof typeof STATUS) =>
  NextResponse.json({ error: MESSAGE[reason] }, { status: STATUS[reason] })

// The Content-Length header can be missing (chunked uploads) or wrong, so count the bytes as they arrive.
async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array(0)
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

// Images on a shared canvas. The token is the only credential and the service-role client
// skips RLS, so the data layer re-checks the token and builds the storage path itself.
export async function GET(_request: Request, { params }: { params: { token: string; key: string } }) {
  try {
    const result = await readSharedCanvasFile(createAdminClient(), params.token, params.key)
    if (result.status !== 'ok') return refuse(result.status)

    // An SVG opened directly on our origin could run script, so the response is a sandboxed
    // download that the canvas reads with fetch().
    return new NextResponse(result.blob, {
      headers: {
        'Content-Type': CANVAS_MIME_TYPES.includes(result.blob.type) ? result.blob.type : 'application/octet-stream',
        'Content-Disposition': 'attachment',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('shared image read failed', { error })
    return NextResponse.json({ error: 'Could not load the image' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { token: string; key: string } }) {
  // Refuse before reading when the client already says the body is too big.
  if (Number(request.headers.get('content-length')) > MAX_CANVAS_FILE_BYTES) return refuse('too_large')

  try {
    const db = createAdminClient()
    // Check the link first, so a wrong token or a view-only link never makes us buffer a body.
    const allowed = await checkSharedUpload(db, params.token)
    if (allowed !== 'ok') return refuse(allowed)

    const body = await readCapped(request, MAX_CANVAS_FILE_BYTES)
    if (!body) return refuse('too_large')
    const type = (request.headers.get('content-type') ?? '').split(';')[0].trim()
    const result = await saveSharedCanvasFile(db, params.token, params.key, new Blob([body], { type }))
    if (result !== 'ok') return refuse(result)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('shared image save failed', { error })
    return NextResponse.json({ error: 'Could not save the image' }, { status: 500 })
  }
}
