import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

// Role-specific redirects (e.g. bouncing a non-admin away from /admin) are
// deliberately NOT done here — Next 16 documents Proxy as an optimistic
// check, not a full authorization solution, and role lives in the app
// database, not the Supabase session token. admin/layout.tsx (which does a
// real DB lookup via getAppUser()) is the actual authority for that; this file only
// handles "logged in" and "verified", both readable straight off the
// Supabase auth user with no extra query.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user } = await updateSupabaseSession(req);

  const isLoggedIn = !!user;
  const verified = user?.email_confirmed_at != null;

  if (pathname.startsWith("/admin") || pathname.startsWith("/tableau-de-bord") || pathname.startsWith("/profil")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/connexion?next=${pathname}`, req.url));
    }
    if (!verified) {
      return NextResponse.redirect(new URL("/verification-email", req.url));
    }
  }

  if (pathname.startsWith("/verification-email") && isLoggedIn && verified) {
    return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
  }

  if (isLoggedIn && (pathname === "/" || pathname.startsWith("/connexion") || pathname.startsWith("/inscription"))) {
    if (!verified) {
      return NextResponse.redirect(new URL("/verification-email", req.url));
    }
    const next = req.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") ? next : "/tableau-de-bord";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/tableau-de-bord/:path*",
    "/profil/:path*",
    "/connexion/:path*",
    "/inscription/:path*",
    "/verification-email/:path*",
  ],
};
