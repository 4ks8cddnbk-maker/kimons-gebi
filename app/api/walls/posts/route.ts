import { NextResponse } from "next/server";
import { createWallPost, deleteWallPost, getWallPost, listWallFollows, listWallPosts } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

export async function GET() {
  try {
    const posts = await listWallPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { posts: [], message: error instanceof Error ? error.message : "Feeds konnten nicht geladen werden." },
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
    return NextResponse.json({ ok: false, message: ".fish ist unvollständig." }, { status: 400 });
  }

  try {
    if (payload.collaboratorId) {
      const follows = await listWallFollows();
      const followsCollaborator = follows.some(
        (follow) => follow.followerId === authorId && follow.followingId === payload.collaboratorId
      );
      const collaboratorFollowsBack = follows.some(
        (follow) => follow.followerId === payload.collaboratorId && follow.followingId === authorId
      );

      if (!followsCollaborator || !collaboratorFollowsBack) {
        return NextResponse.json({ ok: false, message: "Collab-.fish geht nur mit Top-Freunden." }, { status: 403 });
      }
    }

    const post = await createWallPost({
      authorId,
      targetId: payload.targetId,
      collaboratorId: payload.collaboratorId || "",
      postType: payload.postType || "text",
      text: payload.text,
      sticker: payload.sticker || "Neues .fish",
      color: payload.color || "#ffffff",
      mediaUrl: payload.mediaUrl || "",
      songTitle: payload.songTitle || "",
      songArtist: payload.songArtist || "",
      songSrc: payload.songSrc || ""
    });
    return NextResponse.json({ ok: true, post, message: "Im Feed gepostet." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_posts");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert noch. Bitte SUPABASE_SERVICE_ROLE_KEY in Vercel und .env.local setzen oder die Supabase-Fix-SQL ausfuehren."
          : message || ".fish konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const activeProfileId = await getWallSessionProfileId();
  const { postId } = await request.json().catch(() => ({ postId: "" }));

  if (!activeProfileId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!postId) {
    return NextResponse.json({ ok: false, message: ".fish fehlt." }, { status: 400 });
  }

  try {
    const post = await getWallPost(postId);

    if (!post) {
      return NextResponse.json({ ok: false, message: ".fish wurde nicht gefunden." }, { status: 404 });
    }

    if (post.authorId !== activeProfileId && post.targetId !== activeProfileId) {
      return NextResponse.json({ ok: false, message: "Du kannst nur .fishs aus deinem Feed loeschen." }, { status: 403 });
    }

    await deleteWallPost(postId);
    return NextResponse.json({ ok: true, message: ".fish geloescht." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : ".fish konnte nicht geloescht werden." },
      { status: 500 }
    );
  }
}
