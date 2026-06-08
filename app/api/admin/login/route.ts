import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const expected = process.env.ADMIN_PASSWORD || "louki22";

  if (password !== expected) {
    return NextResponse.json({ ok: false, message: "Falsches Passwort." }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
