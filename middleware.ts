import { NextRequest, NextResponse } from "next/server";
import { SITE_COOKIE_NAME, SITE_COOKIE_VALUE } from "@/lib/siteAuth";

const publicPaths = ["/fish-v2", "/api/site-login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasAccess = request.cookies.get(SITE_COOKIE_NAME)?.value === SITE_COOKIE_VALUE;
  const accept = request.headers.get("accept") || "";
  const fetchDestination = request.headers.get("sec-fetch-dest") || "";
  const isDocumentRequest = fetchDestination === "document" || (!pathname.startsWith("/api/") && accept.includes("text/html"));
  const referer = request.headers.get("referer") || "";
  let refererPath = "";

  try {
    refererPath = referer ? new URL(referer).pathname : "";
  } catch {
    refererPath = "";
  }

  if (hasAccess && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/fish-v2";
    return NextResponse.redirect(url);
  }

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (hasAccess) {
    if (isDocumentRequest && !["/fish-v2", "/walls"].includes(refererPath) && pathname !== "/fish-v2") {
      const url = request.nextUrl.clone();
      url.pathname = "/fish-v2";
      return NextResponse.redirect(url);
    }

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
