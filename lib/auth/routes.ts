// Route rules shared by middleware, auth pages and the auth callback.

const PROTECTED_PREFIXES = ['/dashboard', '/teams', '/wokspace', '/workspace', '/shared', '/invite']

// Sign-in screens a signed-in user is bounced away from. /update-password is not
// here: the reset link signs the user in and then lands on it.
const AUTH_PAGES = ['/login', '/signup', '/forgot-password']

export const DEFAULT_AFTER_LOGIN = '/dashboard'

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((prefix) => matchesPrefix(pathname, prefix))
}

// Only same-site relative paths, so ?next= can't be used as an open redirect.
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_LOGIN

  let decoded: string
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return DEFAULT_AFTER_LOGIN
  }

  const unsafe =
    !decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') || /[\x00-\x1f]/.test(decoded)
  if (unsafe) return DEFAULT_AFTER_LOGIN

  const base = 'http://same.site'
  return new URL(next, base).origin === base ? next : DEFAULT_AFTER_LOGIN
}
