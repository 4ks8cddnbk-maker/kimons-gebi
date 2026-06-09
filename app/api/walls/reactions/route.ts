import { NextResponse } from "next/server";
import { createWallComment, deleteWallReactionComments, listWallComments } from "@/lib/supabaseWalls";
import { getWallSessionProfileId } from "@/lib/wallSession";

const reactionPrefix = "__reaction__:";
const allowedReactions = new Set(["thumbs-up", "wow", "heart-eyes", "laugh-cry", "hundred"]);

export async function POST(request: Request) {
  const authorId = await getWallSessionProfileId();
  const { postId, reaction } = await request.json().catch(() => ({ postId: "", reaction: "" }));

  if (!authorId) {
    return NextResponse.json({ ok: false, message: "Bitte erst einloggen." }, { status: 401 });
  }

  if (!postId || !allowedReactions.has(reaction)) {
    return NextResponse.json({ ok: false, message: "Reaktion ist unvollstaendig." }, { status: 400 });
  }

  try {
    const comments = await listWallComments();
    const currentReaction = comments.find(
      (comment) => comment.postId === postId && comment.authorId === authorId && comment.text.startsWith(reactionPrefix)
    );

    await deleteWallReactionComments(postId, authorId);

    if (currentReaction?.text === `${reactionPrefix}${reaction}`) {
      return NextResponse.json({ ok: true, removed: true, message: "Reaktion entfernt." });
    }

    const comment = await createWallComment({
      postId,
      authorId,
      text: `${reactionPrefix}${reaction}`
    });

    return NextResponse.json({ ok: true, comment, message: "Reaktion gespeichert." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isPolicyError =
      message.includes("row-level security") || message.includes("42501") || message.includes("wall_comments");

    return NextResponse.json(
      {
        ok: false,
        message: isPolicyError
          ? "Supabase blockiert noch. Bitte SUPABASE_SERVICE_ROLE_KEY in Vercel und .env.local setzen oder die Supabase-Fix-SQL ausfuehren."
          : message || "Reaktion konnte nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}
