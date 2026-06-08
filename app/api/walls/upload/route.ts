import { NextResponse } from "next/server";
import { getWallProfile, updateWallProfilePhotos, uploadWallImage } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

export async function POST(request: Request) {
  const formData = await request.formData();
  const profileId = await getWallSessionProfileId();
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);

  if (!files.length) {
    return NextResponse.json({ ok: false, message: "Keine Bilder ausgewählt." }, { status: 400 });
  }

  try {
    const urls = await Promise.all(files.slice(0, 6).map((file) => uploadWallImage(file)));
    let profile = null;

    if (!profileId) {
      return NextResponse.json({ ok: true, urls, profile, message: "Bild hochgeladen." });
    }

    const currentProfile = await getWallProfile(profileId);

    if (!currentProfile) {
      return NextResponse.json({ ok: false, message: "Profil wurde nicht gefunden." }, { status: 404 });
    }

    profile = await updateWallProfilePhotos(profileId, [...urls, ...currentProfile.photos].slice(0, 12));

    return NextResponse.json({ ok: true, urls, profile, message: "Bild(er) hochgeladen." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Bild konnte nicht hochgeladen werden." },
      { status: 500 }
    );
  }
}
