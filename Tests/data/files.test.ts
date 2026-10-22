import {
  createFile,
  deleteFile,
  getFile,
  listFiles,
  renameFile,
  saveDocument,
  saveWhiteboard,
  setFileArchived,
} from '@/lib/data/files'
import { fakeDb } from './fakeDb'

const writeTail = [['eq', 'id', 'f1'], ['select', 'id'], ['single']]

describe('files data', () => {
  it('lists a team’s files newest first without the heavy content columns', async () => {
    const { db, calls } = fakeDb({ data: [{ id: 'f1' }] })

    await expect(listFiles(db, 't1')).resolves.toEqual([{ id: 'f1' }])
    expect(calls[0]).toEqual([
      ['from', 'files'],
      ['select', 'id, team_id, name, archived, created_by, created_at, updated_at'],
      ['eq', 'team_id', 't1'],
      ['order', 'created_at', { ascending: false }],
    ])
  })

  it('gets one file with its content, or null when not visible', async () => {
    const { db, calls } = fakeDb({ data: null })

    await expect(getFile(db, 'f1')).resolves.toBeNull()
    expect(calls[0]).toEqual([['from', 'files'], ['select', '*'], ['eq', 'id', 'f1'], ['maybeSingle']])
  })

  it('creates a file in a team', async () => {
    const { db, calls } = fakeDb({ data: { id: 'f1', name: 'Plan' } })

    await expect(createFile(db, 't1', ' Plan ')).resolves.toEqual({ id: 'f1', name: 'Plan' })
    expect(calls[0]).toEqual([['from', 'files'], ['insert', { team_id: 't1', name: 'Plan' }], ['select'], ['single']])
  })

  it('rejects an empty file name', async () => {
    const { db } = fakeDb()
    await expect(createFile(db, 't1', '')).rejects.toThrow('File name is required')
    await expect(renameFile(db, 'f1', ' ')).rejects.toThrow('File name is required')
  })

  it.each([
    ['rename', (db: any) => renameFile(db, 'f1', ' New '), { name: 'New' }],
    ['archive', (db: any) => setFileArchived(db, 'f1', true), { archived: true }],
    ['save document', (db: any) => saveDocument(db, 'f1', { blocks: [] }), { document: { blocks: [] } }],
    ['save whiteboard', (db: any) => saveWhiteboard(db, 'f1', [{ type: 'rect' }]), { whiteboard: [{ type: 'rect' }] }],
  ])('%s updates only that column and confirms a row changed', async (_name, run, patch) => {
    const { db, calls } = fakeDb({ data: { id: 'f1' } })

    await run(db)
    expect(calls[0]).toEqual([['from', 'files'], ['update', patch], ...writeTail])
  })

  it('surfaces a blocked save (e.g. viewer) instead of silently losing it', async () => {
    const { db } = fakeDb({ error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } })
    await expect(saveDocument(db, 'f1', {})).rejects.toThrow('rows returned')
  })

  it('deletes a file', async () => {
    const { db, calls } = fakeDb({ data: { id: 'f1' } })

    await deleteFile(db, 'f1')
    expect(calls[0]).toEqual([['from', 'files'], ['delete'], ...writeTail])
  })
})
