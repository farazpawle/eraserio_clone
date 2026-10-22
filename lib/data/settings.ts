import type { Tables, TablesUpdate } from '@/types/database'
import { type Db, unwrap } from './db'

export type Settings = Tables<'user_settings'>
export type SettingsPatch = Pick<TablesUpdate<'user_settings'>, 'theme' | 'keyboard_shortcuts' | 'preferences'>

// RLS limits this to the signed-in user's row.
export async function getSettings(db: Db) {
  return unwrap(await db.from('user_settings').select('*').maybeSingle())
}

export async function upsertSettings(db: Db, userId: string, patch: SettingsPatch) {
  return unwrap(
    await db
      .from('user_settings')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
      .select()
      .single()
  )
}
