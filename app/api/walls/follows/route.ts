import { NextResponse } from "next/server";
import { followWallProfile, listWallFollows, unfollowWallProfile } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

export async function GET() {
  try {
    const follows = await listWallFollows();
    return NextResponse.json({ follows });
  } catch (error) {
    return NextResponse.json(
      { follows: [], message: error instanceof Error ? error.message : "Freunde konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const activeProfileId = await getWallSessionProfileId();
  const { followingId } = await request.json().catch(() => ({ followingId: "" }));

  if (!activeProfileId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!followingId || followingId === activeProfileId) {
    return NextResponse.json({ ok: false, message: "Dieses Profil kann nicht gefolgt werden." }, { status: 400 });
  }

  try {
    const follow = await followWallProfile(activeProfileId, followingId);
    return NextResponse.json({ ok: true, follow, message: "Gefolgt." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_follows");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert noch. Bitte SUPABASE_SERVICE_ROLE_KEY in Vercel und .env.local setzen oder die Supabase-Fix-SQL ausfuehren."
          : message || "Folgen hat nicht geklappt."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const activeProfileId = await getWallSessionProfileId();
  const { followingId } = await request.json().catch(() => ({ followingId: "" }));

  if (!activeProfileId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!followingId) {
    return NextResponse.json({ ok: false, message: "Profil fehlt." }, { status: 400 });
  }

  try {
    await unfollowWallProfile(activeProfileId, followingId);
    return NextResponse.json({ ok: true, message: "Nicht mehr gefolgt." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_follows");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert noch. Bitte SUPABASE_SERVICE_ROLE_KEY in Vercel und .env.local setzen oder die Supabase-Fix-SQL ausfuehren."
          : message || "Entfolgen hat nicht geklappt."
      },
      { status: 500 }
    );
  }
}
