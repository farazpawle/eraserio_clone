jest.mock('server-only', () => ({}))
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }))

import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Next.js caches server fetches by default; a cached share lookup kept revoked links working.
it('never lets Next.js cache service-role requests', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  const realFetch = jest.fn(async () => ({}))
  global.fetch = realFetch as unknown as typeof fetch

  createAdminClient()
  const options = (createClient as jest.Mock).mock.calls[0][2]
  await options.global.fetch('http://localhost/rest/v1/file_shares', { method: 'GET' })

  expect(realFetch).toHaveBeenCalledWith('http://localhost/rest/v1/file_shares', { method: 'GET', cache: 'no-store' })
})
