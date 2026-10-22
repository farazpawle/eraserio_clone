import type { Tables } from '@/types/database'
import { type Db, requireName, unwrap } from './db'

export type Team = Tables<'teams'>

// RLS returns teams I created or joined; no user filter needed here.
export async function listMyTeams(db: Db) {
  return unwrap(await db.from('teams').select('*').eq('archived', false).order('created_at', { ascending: true }))
}

// The database adds the creator as owner.
export async function createTeam(db: Db, name: string) {
  const teamName = requireName(name, 'Team')
  return unwrap(await db.from('teams').insert({ name: teamName }).select().single())
}

// Only the owner may delete; .single() turns "0 rows deleted" into an error.
export async function deleteTeam(db: Db, id: string) {
  unwrap(await db.from('teams').delete().eq('id', id).select('id').single())
}
