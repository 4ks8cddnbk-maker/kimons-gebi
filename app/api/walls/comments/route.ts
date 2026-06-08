import { NextResponse } from "next/server";
import { createWallComment, listWallComments } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

export async function GET() {
  try {
    const comments = await listWallComments();
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json(
      { comments: [], message: error instanceof Error ? error.message : "Kommentare konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorId = await getWallSessionProfileId();
  const { postId, text } = await request.json().catch(() => ({ postId: "", text: "" }));

  if (!authorId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!postId || !String(text || "").trim()) {
    return NextResponse.json({ ok: false, message: "Kommentar ist leer." }, { status: 400 });
  }

  try {
    const comment = await createWallComment({
      postId,
      authorId,
      text: String(text).trim().slice(0, 500)
    });
    return NextResponse.json({ ok: true, comment, message: "Kommentar gespeichert." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_comments");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert Kommentare noch. Bitte die aktuelle supabase-walls-setup.sql ausfuehren."
          : message || "Kommentar konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}
