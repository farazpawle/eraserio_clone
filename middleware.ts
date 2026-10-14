import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
    const {isAuthenticated} = getKindeServerSession();
    if (!(await isAuthenticated())) {
        // For shared links, redirect to login and then back to the shared content
        const redirectUrl = encodeURIComponent(request.url);
        return NextResponse.redirect(new URL(`/api/auth/login?post_login_redirect_url=${redirectUrl}`, request.url))
    }
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard', '/shared/:path*', '/admin/:path*'],
}