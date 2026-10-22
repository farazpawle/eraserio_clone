import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Landing point for Google sign-in, the sign-up confirmation email and the
// password-reset email. Swaps the one-time code for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Behind the reverse proxy request.url is the container's own address, so prod sets SITE_URL.
  const origin = process.env.SITE_URL ?? request.nextUrl.origin;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("[auth/callback] code exchange failed:", error.message);
  } else {
    // GoTrue sends ?error_description=... for expired or already-used links.
    console.error("[auth/callback] no code:", searchParams.get("error_description") ?? "missing");
  }

  const message = "That sign-in link is invalid or has expired. Please try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}
