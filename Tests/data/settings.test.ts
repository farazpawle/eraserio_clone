import { getSettings, upsertSettings } from '@/lib/data/settings'
import { fakeDb } from './fakeDb'

describe('settings data', () => {
  it('gets my settings row, or null before first save', async () => {
    const { db, calls } = fakeDb({ data: null })

    await expect(getSettings(db)).resolves.toBeNull()
    expect(calls[0]).toEqual([['from', 'user_settings'], ['select', '*'], ['maybeSingle']])
  })

  it('upserts only the fields given', async () => {
    const { db, calls } = fakeDb({ data: { user_id: 'u1', theme: 'dark' } })

    await upsertSettings(db, 'u1', { theme: 'dark' })
    expect(calls[0]).toEqual([
      ['from', 'user_settings'],
      ['upsert', { user_id: 'u1', theme: 'dark' }, { onConflict: 'user_id' }],
      ['select'],
      ['single'],
    ])
  })
})
