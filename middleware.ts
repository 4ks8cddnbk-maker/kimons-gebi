import { NextRequest, NextResponse } from "next/server";
import { SITE_COOKIE_NAME, SITE_COOKIE_VALUE } from "@/lib/siteAuth";

const publicPaths = ["/enter", "/api/site-login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccess = request.cookies.get(SITE_COOKIE_NAME)?.value === SITE_COOKIE_VALUE;

  if (isPublicPath || hasAccess) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: "Passwort erforderlich." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/enter";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

