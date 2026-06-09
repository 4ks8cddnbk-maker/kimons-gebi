import { NextRequest, NextResponse } from "next/server";
import { SITE_COOKIE_NAME, SITE_COOKIE_VALUE } from "@/lib/siteAuth";

const publicPaths = ["/fish-v2", "/api/site-login", "/music"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccess = request.cookies.get(SITE_COOKIE_NAME)?.value === SITE_COOKIE_VALUE;

  if (hasAccess && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/walls";
    return NextResponse.redirect(url);
  }

  if (isPublicPath || hasAccess) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: ".fish V2 ist noch gesperrt." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/fish-v2";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
