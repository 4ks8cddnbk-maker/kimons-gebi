import { NextResponse } from "next/server";
import {
  createWallProfile,
  findWallProfileByHandle,
  getWallProfile,
  listWallFollows,
  listWallProfiles,
  SupabaseProfile,
  updateWallProfile
} from "@/lib/supabaseWalls";
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
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Pinnwand konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const profileId = await getWallSessionProfileId();
  const payload = (await request.json().catch(() => ({}))) as Partial<SupabaseProfile>;

  if (!profileId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  const currentProfile = await getWallProfile(profileId);

  if (!currentProfile) {
    return NextResponse.json({ ok: false, message: "Profil wurde nicht gefunden." }, { status: 404 });
  }

  try {
    const profile = await updateWallProfile(profileId, payload);
    return NextResponse.json({ ok: true, profile, message: "Pinnwand aktualisiert." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Pinnwand konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
}
