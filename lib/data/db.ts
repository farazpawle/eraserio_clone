import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Every data function takes the client, so the same code runs in the browser,
// on the server, and against a stand-in in tests.
export type Db = SupabaseClient<Database>

export class DataError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = 'DataError'
  }
}

export function unwrap<T>({ data, error }: { data: T; error: { message: string; code?: string } | null }): T {
  if (error) throw new DataError(error.message, error.code)
  return data
}

export function requireName(name: string, what: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new DataError(`${what} name is required`)
  return trimmed
}
