import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveSharedFile } from '@/lib/data/shares'

// ponytail: fixed size cap, no rate limit; add one if share links get abused.
const MAX_BYTES = 5 * 1024 * 1024

const STATUS = { forbidden: 403, not_found: 404, revoked: 410, expired: 410 } as const

// Save edits made through a share link. The token is the only credential, so
// saveSharedFile re-checks it (exists, active, not expired, permission = edit).
export async function PUT(request: Request, { params }: { params: { token: string } }) {
  const text = await request.text()
  if (text.length > MAX_BYTES) return NextResponse.json({ error: 'Content too large' }, { status: 413 })

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const result = await saveSharedFile(createAdminClient(), params.token, body)
    if (result !== 'ok') return NextResponse.json({ error: `Link ${result.replace('_', ' ')}` }, { status: STATUS[result] })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('shared save failed', { error })
    return NextResponse.json({ error: 'Could not save changes' }, { status: 500 })
  }
}
