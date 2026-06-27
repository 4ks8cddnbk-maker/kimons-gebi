import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  return NextResponse.json({ ok: false, message: "Der allgemeine Website-Zugang wurde entfernt. Bitte nutze .fish." }, { status: 410 });
}
