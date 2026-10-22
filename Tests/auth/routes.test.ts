import { isAuthPage, isProtectedPath, safeNextPath } from '@/lib/auth/routes'

describe('isProtectedPath', () => {
  it.each([
    '/dashboard',
    '/dashboard/settings',
    '/teams/create',
    '/wokspace/abc',
    '/workspace/abc',
    '/shared/token123',
    '/invite/token123',
  ])('requires login for %s', (path) => {
    expect(isProtectedPath(path)).toBe(true)
  })

  it.each(['/', '/login', '/signup', '/auth/callback', '/dashboards', '/teamsx', '/privacy'])(
    'is public: %s',
    (path) => {
      expect(isProtectedPath(path)).toBe(false)
    }
  )
})

describe('isAuthPage', () => {
  it('matches the sign-in screens only', () => {
    expect(isAuthPage('/login')).toBe(true)
    expect(isAuthPage('/signup')).toBe(true)
    expect(isAuthPage('/forgot-password')).toBe(true)
    expect(isAuthPage('/update-password')).toBe(false) // reached while signed in via the reset link
    expect(isAuthPage('/dashboard')).toBe(false)
  })
})

describe('safeNextPath', () => {
  it('keeps same-site relative paths with query', () => {
    expect(safeNextPath('/wokspace/abc?tab=1')).toBe('/wokspace/abc?tab=1')
    expect(safeNextPath('/update-password')).toBe('/update-password')
  })

  it.each([
    null,
    undefined,
    '',
    'dashboard',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/%2F%2Fevil.com',
    'javascript:alert(1)',
    '/ok\nLocation: x',
  ])('falls back to /dashboard for %p', (next) => {
    expect(safeNextPath(next)).toBe('/dashboard')
  })
})
