import { createTeam, deleteTeam, listMyTeams } from '@/lib/data/teams'
import { fakeDb } from './fakeDb'

describe('teams data', () => {
  it('lists every non-archived team I can see (RLS adds joined teams)', async () => {
    const teams = [{ id: 't1', name: 'Mine' }, { id: 't2', name: 'Joined' }]
    const { db, calls } = fakeDb({ data: teams })

    await expect(listMyTeams(db)).resolves.toEqual(teams)
    expect(calls[0]).toEqual([
      ['from', 'teams'],
      ['select', '*'],
      ['eq', 'archived', false],
      ['order', 'created_at', { ascending: true }],
    ])
  })

  it('creates a team with a trimmed name and returns it', async () => {
    const { db, calls } = fakeDb({ data: { id: 't1', name: 'Design' } })

    await expect(createTeam(db, '  Design  ')).resolves.toEqual({ id: 't1', name: 'Design' })
    expect(calls[0]).toEqual([['from', 'teams'], ['insert', { name: 'Design' }], ['select'], ['single']])
  })

  it('rejects an empty team name without calling the database', async () => {
    const { db, calls } = fakeDb()

    await expect(createTeam(db, '   ')).rejects.toThrow('Team name is required')
    expect(calls).toHaveLength(0)
  })

  it('deletes a team and fails loudly when nothing was deleted', async () => {
    const { db, calls } = fakeDb({ error: { message: 'no rows', code: 'PGRST116' } })

    await expect(deleteTeam(db, 't1')).rejects.toThrow('no rows')
    expect(calls[0]).toEqual([['from', 'teams'], ['delete'], ['eq', 'id', 't1'], ['select', 'id'], ['single']])
  })
})
