import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listPhotos, uploadPhoto } from "@/lib/photos";

export async function GET() {
  const photos = await listPhotos();
  return NextResponse.json({ photos });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: "Nur Admins dürfen Fotos hochladen." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!files.length) {
    return NextResponse.json({ ok: false, message: "Bitte wähle mindestens ein Foto aus." }, { status: 400 });
  }

  if (files.some((file) => !file.type.startsWith("image/"))) {
    return NextResponse.json({ ok: false, message: "Nur Bilddateien sind erlaubt." }, { status: 400 });
  }

  if (files.some((file) => file.size > 8 * 1024 * 1024)) {
    return NextResponse.json({ ok: false, message: "Jedes Foto darf maximal 8 MB groß sein." }, { status: 400 });
  }

  try {
    const photos = await Promise.all(files.map((file) => uploadPhoto(file)));
    return NextResponse.json({ ok: true, photos, message: `${photos.length} Foto(s) hochgeladen.` });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Upload fehlgeschlagen." },
      { status: 500 }
    );
  }
}
