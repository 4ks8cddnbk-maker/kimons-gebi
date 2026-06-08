import { NextResponse } from "next/server";
import { createWallPost, listWallPosts } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

export async function GET() {
  try {
    const posts = await listWallPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { posts: [], message: error instanceof Error ? error.message : "Pins konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    targetId?: string;
    collaboratorId?: string;
    postType?: string;
    text?: string;
    sticker?: string;
    color?: string;
    mediaUrl?: string;
    songTitle?: string;
    songArtist?: string;
    songSrc?: string;
  };
  const authorId = await getWallSessionProfileId();

  if (!authorId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!payload.targetId || !payload.text) {
    return NextResponse.json({ ok: false, message: "Pin ist unvollständig." }, { status: 400 });
  }

  try {
    const post = await createWallPost({
      authorId,
      targetId: payload.targetId,
      collaboratorId: payload.collaboratorId || "",
      postType: payload.postType || "text",
      text: payload.text,
      sticker: payload.sticker || "Aqua Star",
      color: payload.color || "#ffffff",
      mediaUrl: payload.mediaUrl || "",
      songTitle: payload.songTitle || "",
      songArtist: payload.songArtist || "",
      songSrc: payload.songSrc || ""
    });
    return NextResponse.json({ ok: true, post, message: "An die Wand gepinnt." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Pin konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
