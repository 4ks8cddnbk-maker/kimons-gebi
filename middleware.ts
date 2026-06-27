import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accept = request.headers.get("accept") || "";
  const fetchDestination = request.headers.get("sec-fetch-dest") || "";
  const isDocumentRequest = fetchDestination === "document" || (!pathname.startsWith("/api/") && accept.includes("text/html"));

  if (pathname === "/fish-v2" || pathname.startsWith("/fish-v2/") || pathname === "/enter") {
    const url = request.nextUrl.clone();
    url.pathname = "/walls";
    return NextResponse.redirect(url);
  }

  if (pathname === "/" || pathname === "/walls" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isDocumentRequest) {
    const url = request.nextUrl.clone();
    url.pathname = "/walls";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
