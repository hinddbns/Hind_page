import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const homeHref = role === "ADMIN" ? "/admin" : "/tableau-de-bord";

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/connexion?next=${pathname}`, req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/tableau-de-bord", req.url));
    }
  }

  if (pathname.startsWith("/tableau-de-bord") || pathname.startsWith("/profil")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/connexion?next=${pathname}`, req.url));
    }
  }

  if (isLoggedIn && (pathname === "/" || pathname.startsWith("/connexion") || pathname.startsWith("/inscription"))) {
    const next = req.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") ? next : homeHref;
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/tableau-de-bord/:path*",
    "/profil/:path*",
    "/connexion/:path*",
    "/inscription/:path*",
  ],
};
