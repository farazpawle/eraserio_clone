import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_AFTER_LOGIN, isAuthPage, isProtectedPath } from '@/lib/auth/routes'

// Runs on every page request: refreshes the Supabase session cookie, then guards routes.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  // Nothing may run between creating the client and getClaims(): it refreshes the
  // session, and skipping it signs users out at random.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  const { pathname, search } = request.nextUrl

  if (!signedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return redirectKeepingSession(url, response)
  }

  if (signedIn && isAuthPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = DEFAULT_AFTER_LOGIN
    url.search = ''
    return redirectKeepingSession(url, response)
  }

  return response
}

// A redirect must carry the refreshed session cookies and no-cache headers too.
function redirectKeepingSession(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = sessionResponse.headers.get(header)
    if (value) redirect.headers.set(header, value)
  }
  return redirect
}

export const config = {
  // Everything except Next internals, API routes and static files.
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
