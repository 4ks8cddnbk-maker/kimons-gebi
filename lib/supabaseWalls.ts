export type SupabaseWallPost = {
  id: string;
  authorId: string;
  targetId: string;
  text: string;
  sticker: string;
  createdAt: string;
};

export type SupabaseProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  mood: string;
  song: string;
  theme: string;
  pattern: string;
  stickerPack: string;
  headline: string;
  glitter: boolean;
  photos: string[];
};

type ProfileRow = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  bio: string;
  mood: string;
  song: string;
  theme: string;
  pattern: string | null;
  sticker_pack: string | null;
  headline: string | null;
  glitter: boolean | null;
  password_hash?: string | null;
  photos: string[] | null;
  created_at?: string;
};

type PostRow = {
  id: string;
  author_id: string;
  target_id: string;
  text: string;
  sticker: string;
  created_at: string;
};

export const defaultWallProfile: SupabaseProfile = {
  id: "kimon",
  name: "Kimon",
  handle: "birthday-host",
  avatar: "",
  bio: "Host der 23. Geburtstagsnacht. Hier darf alles angepinnt werden, was später lustig ist.",
  mood: "bereit fuer Karaoke",
  song: "Moment - C4RL",
  theme: "blue",
  pattern: "aqua",
  stickerPack: "party",
  headline: "Willkommen auf Kimons Pinnwand",
  glitter: true,
  photos: []
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const bucketName = process.env.SUPABASE_WALL_BUCKET || "wall-images";

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase ist noch nicht konfiguriert.");
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toProfile(row: ProfileRow): SupabaseProfile {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    avatar: row.avatar || "",
    bio: row.bio,
    mood: row.mood,
    song: row.song,
    theme: row.theme,
    pattern: row.pattern || "aqua",
    stickerPack: row.sticker_pack || "party",
    headline: row.headline || "Meine Pinnwand",
    glitter: Boolean(row.glitter),
    photos: row.photos || []
  };
}

function toProfileRow(profile: SupabaseProfile, passwordHash?: string) {
  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatar: profile.avatar,
    bio: profile.bio,
    mood: profile.mood,
    song: profile.song,
    theme: profile.theme,
    pattern: profile.pattern,
    sticker_pack: profile.stickerPack,
    headline: profile.headline,
    glitter: profile.glitter,
    photos: profile.photos,
    ...(passwordHash ? { password_hash: passwordHash } : {})
  };
}

function toPost(row: PostRow): SupabaseWallPost {
  return {
    id: row.id,
    authorId: row.author_id,
    targetId: row.target_id,
    text: row.text,
    sticker: row.sticker,
    createdAt: row.created_at
  };
}

function toPostRow(post: SupabaseWallPost) {
  return {
    id: post.id,
    author_id: post.authorId,
    target_id: post.targetId,
    text: post.text,
    sticker: post.sticker
  };
}

async function supabaseRest(path: string, init: RequestInit = {}) {
  assertSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase konnte nicht erreicht werden.");
  }

  return response;
}

export async function listWallProfiles() {
  const response = await supabaseRest("wall_profiles?select=*&order=created_at.asc");
  const rows = (await response.json()) as ProfileRow[];

  if (rows.length) return rows.map(toProfile);

  await createWallProfile(defaultWallProfile, "");
  return [defaultWallProfile];
}

export async function createWallProfile(profile: SupabaseProfile, passwordHash: string) {
  const response = await supabaseRest("wall_profiles", {
    method: "POST",
    body: JSON.stringify(toProfileRow(profile, passwordHash))
  });
  const rows = (await response.json()) as ProfileRow[];
  return toProfile(rows[0]);
}

export async function findWallProfileByHandle(handle: string) {
  const response = await supabaseRest(`wall_profiles?handle=eq.${encodeURIComponent(handle)}&select=*&limit=1`);
  const rows = (await response.json()) as ProfileRow[];
  return rows[0] || null;
}

export async function getWallProfile(id: string) {
  const response = await supabaseRest(`wall_profiles?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const rows = (await response.json()) as ProfileRow[];
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateWallProfile(id: string, profile: Partial<SupabaseProfile>) {
  const row = {
    ...(profile.name ? { name: profile.name } : {}),
    ...(profile.handle ? { handle: profile.handle } : {}),
    ...(profile.avatar !== undefined ? { avatar: profile.avatar } : {}),
    ...(profile.bio !== undefined ? { bio: profile.bio } : {}),
    ...(profile.mood !== undefined ? { mood: profile.mood } : {}),
    ...(profile.song !== undefined ? { song: profile.song } : {}),
    ...(profile.theme !== undefined ? { theme: profile.theme } : {}),
    ...(profile.pattern !== undefined ? { pattern: profile.pattern } : {}),
    ...(profile.stickerPack !== undefined ? { sticker_pack: profile.stickerPack } : {}),
    ...(profile.headline !== undefined ? { headline: profile.headline } : {}),
    ...(profile.glitter !== undefined ? { glitter: profile.glitter } : {})
  };
  const response = await supabaseRest(`wall_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(row)
  });
  const rows = (await response.json()) as ProfileRow[];
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateWallProfilePhotos(id: string, photos: string[]) {
  const response = await supabaseRest(`wall_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ photos })
  });
  const rows = (await response.json()) as ProfileRow[];
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function listWallPosts() {
  const response = await supabaseRest("wall_posts?select=*&order=created_at.desc");
  const rows = (await response.json()) as PostRow[];
  return rows.map(toPost);
}

export async function createWallPost(post: Omit<SupabaseWallPost, "id" | "createdAt">) {
  const response = await supabaseRest("wall_posts", {
    method: "POST",
    body: JSON.stringify(
      toPostRow({
        ...post,
        id: createId(),
        createdAt: new Date().toISOString()
      })
    )
  });
  const rows = (await response.json()) as PostRow[];
  return toPost(rows[0]);
}

export async function uploadWallImage(file: File) {
  assertSupabaseConfig();

  if (!file.type.startsWith("image/")) {
    throw new Error("Nur Bilder sind erlaubt.");
  }

  if (file.size > 6 * 1024 * 1024) {
    throw new Error("Ein Bild darf maximal 6 MB gross sein.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": file.type,
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Bild konnte nicht hochgeladen werden.");
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
}
