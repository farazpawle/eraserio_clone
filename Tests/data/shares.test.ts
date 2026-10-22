import { createShareLink, listShares, resolveShareToken, revokeShare, saveSharedFile } from '@/lib/data/shares'
import { fakeDb } from './fakeDb'

const TOKEN = 'a'.repeat(64)
const NOW = new Date('2026-10-22T12:00:00Z')
const file = { id: 'f1', name: 'Plan', document: null, whiteboard: null }
const share = (over: object = {}) => ({ id: 's1', permission: 'view', expires_at: null, is_active: true, file, ...over })

describe('shares data', () => {
  it('creates a link for a file', async () => {
    const { db, calls } = fakeDb({ data: { id: 's1', token: TOKEN } })

    await expect(createShareLink(db, 'f1', 'edit', null)).resolves.toEqual({ id: 's1', token: TOKEN })
    expect(calls[0]).toEqual([
      ['from', 'file_shares'],
      ['insert', { file_id: 'f1', permission: 'edit', expires_at: null }],
      ['select'],
      ['single'],
    ])
  })

  it('lists only active links', async () => {
    const { db, calls } = fakeDb({ data: [] })

    await listShares(db, 'f1')
    expect(calls[0]).toEqual([
      ['from', 'file_shares'],
      ['select', '*'],
      ['eq', 'file_id', 'f1'],
      ['eq', 'is_active', true],
      ['order', 'created_at', { ascending: false }],
    ])
  })

  it('revokes by deactivating', async () => {
    const { db, calls } = fakeDb({ data: { id: 's1' } })

    await revokeShare(db, 's1')
    expect(calls[0]).toEqual([
      ['from', 'file_shares'],
      ['update', { is_active: false }],
      ['eq', 'id', 's1'],
      ['select', 'id'],
      ['single'],
    ])
  })

  describe('resolveShareToken', () => {
    it('returns the share and file for a live token', async () => {
      const { db, calls } = fakeDb({ data: share() })

      await expect(resolveShareToken(db, TOKEN, NOW)).resolves.toEqual({
        status: 'ok',
        permission: 'view',
        file,
      })
      expect(calls[0]).toEqual([
        ['from', 'file_shares'],
        ['select', 'permission, expires_at, is_active, file:files(id, name, document, whiteboard)'],
        ['eq', 'token', TOKEN],
        ['maybeSingle'],
      ])
    })

    it('refuses a malformed token without querying', async () => {
      const { db, calls } = fakeDb()
      await expect(resolveShareToken(db, '../etc', NOW)).resolves.toEqual({ status: 'not_found' })
      expect(calls).toHaveLength(0)
    })

    it.each([
      ['unknown', null, 'not_found'],
      ['revoked', share({ is_active: false }), 'revoked'],
      ['expired', share({ expires_at: '2026-10-22T11:59:59Z' }), 'expired'],
    ])('refuses an %s token', async (_n, data, status) => {
      const { db } = fakeDb({ data })
      await expect(resolveShareToken(db, TOKEN, NOW)).resolves.toEqual({ status })
    })

    it('accepts a link that expires later', async () => {
      const { db } = fakeDb({ data: share({ expires_at: '2026-10-23T00:00:00Z' }) })
      await expect(resolveShareToken(db, TOKEN, NOW)).resolves.toMatchObject({ status: 'ok' })
    })
  })

  describe('saveSharedFile', () => {
    it('saves through an edit link', async () => {
      const { db, calls } = fakeDb({ data: share({ permission: 'edit' }) }, { data: { id: 'f1' } })

      await expect(saveSharedFile(db, TOKEN, { document: { blocks: [] } }, NOW)).resolves.toBe('ok')
      expect(calls[1]).toEqual([
        ['from', 'files'],
        ['update', { document: { blocks: [] } }],
        ['eq', 'id', 'f1'],
        ['select', 'id'],
        ['single'],
      ])
    })

    it.each(['view', 'comment'])('refuses to save through a %s link', async (permission) => {
      const { db, calls } = fakeDb({ data: share({ permission }) })
      await expect(saveSharedFile(db, TOKEN, { document: {} }, NOW)).resolves.toBe('forbidden')
      expect(calls).toHaveLength(1)
    })

    it('refuses to save through an expired link', async () => {
      const { db } = fakeDb({ data: share({ permission: 'edit', expires_at: '2026-01-01T00:00:00Z' }) })
      await expect(saveSharedFile(db, TOKEN, { document: {} }, NOW)).resolves.toBe('expired')
    })

    it('only writes the document and whiteboard columns', async () => {
      const { db, calls } = fakeDb({ data: share({ permission: 'edit' }) }, { data: { id: 'f1' } })

      await saveSharedFile(db, TOKEN, { whiteboard: [1], name: 'hacked', team_id: 'x' } as any, NOW)
      expect(calls[1][1]).toEqual(['update', { whiteboard: [1] }])
    })
  })
})
