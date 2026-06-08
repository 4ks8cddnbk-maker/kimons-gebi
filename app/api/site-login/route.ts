import { NextResponse } from "next/server";
import { SITE_COOKIE_NAME, SITE_COOKIE_VALUE, SITE_PASSWORD } from "@/lib/siteAuth";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Das Passwort stimmt nicht." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_COOKIE_NAME, SITE_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

