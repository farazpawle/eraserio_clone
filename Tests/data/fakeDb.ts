import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Result = { data?: unknown; error?: { message: string; code?: string } | null }

// Stand-in Supabase client: records each query chain and answers awaits from a queue.
// RLS itself is covered by supabase/tests/rls.sql; these tests check what the code asks for.
export function fakeDb(...results: Result[]) {
  const calls: unknown[][][] = []
  const queue = [...results]

  const chain = (log: unknown[][]): unknown => {
    const proxy: unknown = new Proxy(() => {}, {
      get(_target, prop) {
        if (prop === 'then') {
          const r = queue.shift() ?? {}
          const settled = { data: r.data ?? null, error: r.error ?? null }
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(settled).then(res, rej)
        }
        return (...args: unknown[]) => {
          log.push([prop as string, ...args])
          return proxy
        }
      },
    })
    return proxy
  }

  const start = (first: unknown[]) => {
    const log = [first]
    calls.push(log)
    return chain(log)
  }

  const db = {
    from: (table: string) => start(['from', table]),
    rpc: (fn: string, args: unknown) => start(['rpc', fn, args]),
  }

  return { db: db as unknown as SupabaseClient<Database>, calls }
}
