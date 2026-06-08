import { NextResponse } from "next/server";
import {
  createWallProfile,
  deleteWallProfile,
  findWallProfileByHandle,
  getWallProfile,
  listWallFollows,
  listWallProfiles,
  SupabaseProfile,
  updateWallProfile
} from "@/lib/supabaseWalls";
import { isAdmin } from "@/lib/auth";
import { getWallSessionProfileId, hashPassword, setWallSession } from "@/lib/wallSession";

export async function GET() {
  try {
    const [profiles, follows] = await Promise.all([listWallProfiles(), listWallFollows()]);
    const activeProfileId = await getWallSessionProfileId();
    return NextResponse.json({ profiles, follows, activeProfileId });
  } catch (error) {
    return NextResponse.json(
      { profiles: [], message: error instanceof Error ? error.message : "Pinnwände konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as (SupabaseProfile & { password?: string }) | null;

  if (!payload?.name || !payload.handle || !payload.password) {
    return NextResponse.json({ ok: false, message: "Name, Nutzername und Passwort sind Pflicht." }, { status: 400 });
  }

  try {
    const existingProfile = await findWallProfileByHandle(payload.handle);

    if (existingProfile) {
      return NextResponse.json({ ok: false, message: "Diesen Nutzernamen gibt es schon." }, { status: 409 });
    }

    const { password, ...profile } = payload;
    const createdProfile = await createWallProfile(profile, hashPassword(password));
    await setWallSession(createdProfile.id);
    return NextResponse.json({ ok: true, profile: createdProfile, message: "Pinnwand erstellt." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_profiles");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert .fish Profile noch. Bitte supabase-fish-sofort-fix.sql im Supabase SQL Editor ausfuehren."
          : message || ".fish konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const sessionProfileId = await getWallSessionProfileId();
  const admin = await isAdmin();
  const payload = (await request.json().catch(() => ({}))) as Partial<SupabaseProfile> & { profileId?: string };
  const targetProfileId = admin && payload.profileId ? payload.profileId : sessionProfileId;
  const profilePayload = { ...payload };
  delete profilePayload.profileId;

  if (!targetProfileId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  const currentProfile = await getWallProfile(targetProfileId);

  if (!currentProfile) {
    return NextResponse.json({ ok: false, message: "Profil wurde nicht gefunden." }, { status: 404 });
  }

  try {
    const profile = await updateWallProfile(targetProfileId, profilePayload);
    return NextResponse.json({ ok: true, profile, message: "Pinnwand aktualisiert." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_profiles");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert .fish Profile noch. Bitte supabase-fish-sofort-fix.sql im Supabase SQL Editor ausfuehren."
          : message || ".fish konnte nicht aktualisiert werden."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await isAdmin();
  const { profileId } = await request.json().catch(() => ({ profileId: "" }));

  if (!admin) {
    return NextResponse.json({ ok: false, message: "Nur Admins koennen Profile loeschen." }, { status: 403 });
  }

  if (!profileId || profileId === "kimon") {
    return NextResponse.json({ ok: false, message: "Dieses Profil kann nicht geloescht werden." }, { status: 400 });
  }

  try {
    await deleteWallProfile(profileId);
    return NextResponse.json({ ok: true, message: "Profil geloescht." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Profil konnte nicht geloescht werden." },
      { status: 500 }
    );
  }
}
