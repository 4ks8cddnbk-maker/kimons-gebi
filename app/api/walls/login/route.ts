import { NextResponse } from "next/server";
import { findWallProfileByHandle } from "@/lib/supabaseWalls";
import { clearWallSession, setWallSession, verifyPassword } from "@/lib/wallSession";

export async function POST(request: Request) {
  const { handle, password } = await request.json().catch(() => ({ handle: "", password: "" }));

  if (!handle || !password) {
    return NextResponse.json({ ok: false, message: "Nutzername und Passwort sind Pflicht." }, { status: 400 });
  }

  try {
    const row = await findWallProfileByHandle(String(handle).replace(/^@/, ""));

    if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
      return NextResponse.json({ ok: false, message: "Login stimmt nicht." }, { status: 401 });
    }

    await setWallSession(row.id);
    return NextResponse.json({ ok: true, activeProfileId: row.id, message: "Eingeloggt." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Login konnte nicht geprüft werden." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearWallSession();
  return NextResponse.json({ ok: true, message: "Ausgeloggt." });
}
