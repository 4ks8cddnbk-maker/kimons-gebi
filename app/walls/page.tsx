"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type WallPost = {
  id: string;
  authorId: string;
  targetId: string;
  collaboratorId: string;
  postType: string;
  text: string;
  sticker: string;
  color: string;
  mediaUrl: string;
  songTitle: string;
  songArtist: string;
  songSrc: string;
  createdAt: string;
};

type WallComment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

type Profile = {
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
  backgroundColor: string;
  accentColor: string;
  fontStyle: string;
  layoutDensity: string;
  verified: boolean;
  photos: string[];
};

type Follow = {
  followerId: string;
  followingId: string;
};

const tracks = [
  { title: "Moment", artist: "C4RL", src: "/music/c4rl-moment.mp3" },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus", src: "/music/party-in-the-usa.mp3" },
  { title: "The One That Got Away", artist: "Katy Perry", src: "/music/the-one-that-got-away.mp3" }
];

const stickerOptions = [
  "Aqua Star",
  "Mixtape",
  "Karaoke",
  "Glitter Comment",
  "Top 8 Energy",
  "Afterparty Seal",
  "iPod Approved",
  "Main Character"
];
const themeOptions = [
  { value: "blue", label: "Aqua Blau", accent: "#66b9f1", background: "#dcecff" },
  { value: "green", label: "Limewire Gruen", accent: "#33b75a", background: "#dff7e5" },
  { value: "pink", label: "MySpace Pink", accent: "#ec6fa9", background: "#ffe4f0" },
  { value: "gold", label: "iPod Gold", accent: "#d9a626", background: "#fff3ca" },
  { value: "purple", label: "Neon Lila", accent: "#8a6dff", background: "#ece8ff" },
  { value: "black", label: "Black Chrome", accent: "#20293a", background: "#dfe4ec" }
];
const patternOptions = [
  { value: "aqua", label: "Aqua Streifen" },
  { value: "stars", label: "Sterne" },
  { value: "checker", label: "Checkerboard" },
  { value: "hearts", label: "Hearts" },
  { value: "scanlines", label: "CRT Lines" }
];
const fontOptions = [
  { value: "lucida", label: "Lucida Grande" },
  { value: "georgia", label: "Georgia Blog" },
  { value: "mono", label: "Terminal Mono" },
  { value: "verdana", label: "Verdana Web" }
];
const densityOptions = [
  { value: "compact", label: "Kompakt" },
  { value: "cozy", label: "Normal" },
  { value: "loud", label: "Maximal MySpace" }
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHandle(handle: string) {
  return handle
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function WallsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [comments, setComments] = useState<WallComment[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [viewProfileId, setViewProfileId] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateFish, setShowCreateFish] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newFishOpen, setNewFishOpen] = useState(false);
  const [fishType, setFishType] = useState<"text" | "image" | "song">("text");
  const [showFishPage, setShowFishPage] = useState(true);
  const [playerCollapsed, setPlayerCollapsed] = useState(false);
  const [followPulse, setFollowPulse] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState(0);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const [loginHandle, setLoginHandle] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;
  const viewProfile =
    profiles.find((profile) => profile.id === viewProfileId) || activeProfile || profiles.find(Boolean) || null;
  const wallPosts = useMemo(
    () =>
      viewProfile
        ? posts
            .filter(
              (post) =>
                post.targetId === viewProfile.id || post.authorId === viewProfile.id || post.collaboratorId === viewProfile.id
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [posts, viewProfile]
  );
  const fishPagePosts = useMemo(
    () =>
      posts
        .filter((post) => post.authorId !== activeProfile?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 24),
    [activeProfile, posts]
  );
  const commentsByPost = useMemo(() => {
    return comments.reduce<Record<string, WallComment[]>>((groups, comment) => {
      groups[comment.postId] = [...(groups[comment.postId] || []), comment];
      return groups;
    }, {});
  }, [comments]);
  const notifications = useMemo(() => {
    if (!activeProfile) return [];

    const followNotes = follows
      .filter((follow) => follow.followingId === activeProfile.id)
      .map((follow) => {
        const follower = profiles.find((profile) => profile.id === follow.followerId);
        return {
          id: `follow-${follow.followerId}`,
          text: `${follower?.name || "Jemand"} folgt dir jetzt.`,
          profileId: follow.followerId,
          postId: ""
        };
      });
    const collabNotes = posts
      .filter((post) => post.collaboratorId === activeProfile.id && post.authorId !== activeProfile.id)
      .map((post) => {
        const author = profiles.find((profile) => profile.id === post.authorId);
        return {
          id: `collab-${post.id}`,
          text: `${author?.name || "Jemand"} hat dich in einem .fish markiert.`,
          profileId: post.targetId || post.authorId,
          postId: post.id
        };
      });
    const commentNotes = comments
      .filter((comment) => {
        const post = posts.find((item) => item.id === comment.postId);
        return post?.authorId === activeProfile.id && comment.authorId !== activeProfile.id;
      })
      .slice(-8)
      .map((comment) => {
        const author = profiles.find((profile) => profile.id === comment.authorId);
        return {
          id: `comment-${comment.id}`,
          text: `${author?.name || "Jemand"} hat dein .fish kommentiert.`,
          profileId: comment.authorId,
          postId: comment.postId
        };
      });

    return [...commentNotes, ...collabNotes, ...followNotes].slice(0, 10);
  }, [activeProfile, comments, follows, posts, profiles]);
  const mutualFriends = useMemo(() => {
    if (!viewProfile) return [];

    return profiles.filter((profile) => {
      if (profile.id === viewProfile.id) return false;
      const followsThem = follows.some(
        (follow) => follow.followerId === viewProfile.id && follow.followingId === profile.id
      );
      const followsBack = follows.some(
        (follow) => follow.followerId === profile.id && follow.followingId === viewProfile.id
      );
      return followsThem && followsBack;
    });
  }, [follows, profiles, viewProfile]);
  const isFollowingViewProfile =
    Boolean(activeProfile && viewProfile) &&
    follows.some((follow) => follow.followerId === activeProfile?.id && follow.followingId === viewProfile?.id);
  const visibleProfiles = useMemo(() => {
    const search = profileSearch.trim().toLowerCase();
    if (!search) return profiles;

    return profiles.filter((profile) =>
      [profile.name, profile.handle, profile.headline].some((value) => value.toLowerCase().includes(search))
    );
  }, [profileSearch, profiles]);
  const editableProfile = viewProfile && (isAdmin || activeProfile?.id === viewProfile.id) ? viewProfile : null;

  function notify(message: string) {
    setStatus(message);
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    loadWalls();
  }, []);

  useEffect(() => {
    if (!activeProfileId) return;

    const interval = window.setInterval(() => {
      loadWalls(false);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeProfileId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [activeTrack, isPlaying]);

  async function loadWalls(showSpinner = true) {
    if (showSpinner) setLoading(true);

    try {
      const [profilesResponse, postsResponse] = await Promise.all([
        fetch("/api/walls/profiles", { cache: "no-store" }),
        fetch("/api/walls/posts", { cache: "no-store" })
      ]);
      const commentsResponse = await fetch("/api/walls/comments", { cache: "no-store" });
      const profilesData = await profilesResponse.json();
      const postsData = await postsResponse.json();
      const commentsData = await commentsResponse.json();
      const nextProfiles = profilesData.profiles || [];
      const nextActiveProfileId = profilesData.activeProfileId || "";

      setProfiles(nextProfiles);
      setFollows(profilesData.follows || []);
      setPosts(postsData.posts || []);
      setComments(commentsData.comments || []);
      setActiveProfileId(nextActiveProfileId);
      setViewProfileId((currentId) => {
        if (currentId && nextProfiles.some((profile: Profile) => profile.id === currentId)) return currentId;
        return nextActiveProfileId || "";
      });

      if (!profilesResponse.ok || !postsResponse.ok) {
        notify(profilesData.message || postsData.message || ".fish Profile konnten nicht geladen werden.");
      }
    } catch {
      notify(".fish Profile konnten nicht geladen werden.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function uploadFiles(files: File[], mode: "profile" | "pin" = "profile") {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("mode", mode);

    const response = await fetch("/api/walls/upload", {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload fehlgeschlagen.");
    }

    return data as { urls: string[]; profile?: Profile; message?: string };
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    notify("Login wird geprüft...");

    const response = await fetch("/api/walls/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: normalizeHandle(loginHandle), password: loginPassword })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Login stimmt nicht.");
      return;
    }

    setLoginHandle("");
    setLoginPassword("");
    notify("Eingeloggt. Willkommen zurück auf .fish.");
    await loadWalls();
  }

  async function logout() {
    await fetch("/api/walls/login", { method: "DELETE" });
    setActiveProfileId("");
    setViewProfileId("");
    setSideMenuOpen(false);
    notify("Ausgeloggt.");
    await loadWalls();
  }

  async function adminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    notify("Admin-Modus ist aus.");
  }

  async function adminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    notify("Admin-Zugang wird geprüft...");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword })
    });
    const data = await response.json().catch(() => ({ message: "" }));

    if (!response.ok) {
      notify(data.message || "Admin-Passwort stimmt nicht.");
      return;
    }

    setIsAdmin(true);
    setAdminPassword("");
    notify("Admin aktiv. Du kannst geöffnete .fish Profile bearbeiten.");
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("avatar");
    const name = String(formData.get("name") || "").trim();
    const handle = normalizeHandle(String(formData.get("handle") || name));
    const password = String(formData.get("password") || "");
    const selectedTheme = themeOptions.find((theme) => theme.value === String(formData.get("theme"))) || themeOptions[0];

    if (!name || !handle || !password) {
      notify("Bitte Name, Nutzername und Passwort eintragen.");
      return;
    }

    notify(".fish wird erstellt...");

    let avatar = "";

    try {
      if (file instanceof File && file.size) {
        const upload = await uploadFiles([file], "pin");
        avatar = upload.urls[0] || "";
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Profilbild konnte nicht hochgeladen werden.");
      return;
    }

    const profile: Profile = {
      id: createId(),
      name,
      handle,
      avatar,
      bio: String(formData.get("bio") || "Noch keine Bio, aber bestimmt eine starke Pinnwand."),
      mood: String(formData.get("mood") || "online"),
      song: String(formData.get("song") || "Karaoke Song offen"),
      theme: selectedTheme.value,
      pattern: String(formData.get("pattern") || "aqua"),
      stickerPack: "party",
      headline: String(formData.get("headline") || `${name}s .fish`),
      glitter: formData.get("glitter") === "on",
      backgroundColor: String(formData.get("backgroundColor") || selectedTheme.background),
      accentColor: String(formData.get("accentColor") || selectedTheme.accent),
      fontStyle: String(formData.get("fontStyle") || "lucida"),
      layoutDensity: String(formData.get("layoutDensity") || "cozy"),
      verified: false,
      photos: []
    };

    const response = await fetch("/api/walls/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, password })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish konnte nicht gespeichert werden.");
      return;
    }

    notify(".fish erstellt und eingeloggt.");
    form.reset();
    setShowCreateFish(false);
    await loadWalls();
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    notify("Bild(er) werden hochgeladen...");

    try {
      const data = await uploadFiles(files);
      notify(data.message || "Bild(er) auf deine .fish gelegt.");
      event.target.value = "";
      await loadWalls(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function saveStyle(event: FormEvent<HTMLFormElement>) {
    if (!editableProfile) return;

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    notify(".fish Style wird gespeichert...");

    const payload = {
      profileId: isAdmin ? editableProfile.id : undefined,
      headline: String(formData.get("headline") || editableProfile.headline),
      bio: String(formData.get("bio") || editableProfile.bio),
      mood: String(formData.get("mood") || editableProfile.mood),
      song: String(formData.get("song") || editableProfile.song),
      theme: String(formData.get("theme") || editableProfile.theme),
      pattern: String(formData.get("pattern") || editableProfile.pattern),
      backgroundColor: String(formData.get("backgroundColor") || editableProfile.backgroundColor),
      accentColor: String(formData.get("accentColor") || editableProfile.accentColor),
      fontStyle: String(formData.get("fontStyle") || editableProfile.fontStyle),
      layoutDensity: String(formData.get("layoutDensity") || editableProfile.layoutDensity),
      verified: isAdmin ? formData.get("verified") === "on" : editableProfile.verified,
      glitter: formData.get("glitter") === "on"
    };

    const response = await fetch("/api/walls/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish Style konnte nicht gespeichert werden.");
      return;
    }

    notify(".fish Style gespeichert.");
    setEditProfileOpen(false);
    await loadWalls(false);
  }

  async function createPost(payload: Partial<WallPost>) {
    if (!viewProfile) return false;

    const response = await fetch("/api/walls/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: viewProfile.id,
        ...payload
      })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish konnte nicht gespeichert werden.");
      return false;
    }

    await loadWalls(false);
    return true;
  }

  async function pinText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) return;

    notify(".fish wird gespeichert...");
    const saved = await createPost({
      postType: "text",
      text,
      sticker: String(formData.get("sticker") || stickerOptions[0]),
      color: String(formData.get("color") || "#ffffff")
    } as WallPost);
    if (saved) {
      notify("Text-.fish ist im Feed.");
      form.reset();
      setNewFishOpen(false);
    }
  }

  async function pinImage(event: FormEvent<HTMLFormElement>) {
    if (!viewProfile || !activeProfile) return;

    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image");
    const text = String(formData.get("text") || "").trim();

    if (!(file instanceof File) || !file.size) {
      notify("Bitte ein Bild auswählen.");
      return;
    }

    notify("Bild-.fish wird hochgeladen...");

    try {
      const upload = await uploadFiles([file], "pin");
      const saved = await createPost({
        postType: "image",
        text: text || "Bild-.fish",
        sticker: String(formData.get("sticker") || "Collab .fish"),
        color: String(formData.get("color") || "#ffffff"),
        mediaUrl: upload.urls[0],
        collaboratorId: viewProfile.id !== activeProfile.id ? viewProfile.id : ""
      } as WallPost);
      if (saved) {
        notify("Bild-.fish ist im Feed.");
        form.reset();
        setNewFishOpen(false);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Bild-.fish konnte nicht gespeichert werden.");
    }
  }

  async function pinSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const track = tracks[Number(formData.get("track")) || 0];

    notify("Song wird als .fish gepinnt...");
    const saved = await createPost({
      postType: "song",
      text: String(formData.get("text") || "Song aus der Party-Playlist"),
      sticker: "iPod Approved",
      color: String(formData.get("color") || "#eef6ff"),
      songTitle: track.title,
      songArtist: track.artist,
      songSrc: track.src
    } as WallPost);
    if (saved) {
      notify("Song-.fish ist im Feed.");
      form.reset();
      setNewFishOpen(false);
    }
  }

  async function toggleFollow() {
    if (!activeProfile || !viewProfile || activeProfile.id === viewProfile.id) return;

    const response = await fetch("/api/walls/follows", {
      method: isFollowingViewProfile ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: viewProfile.id })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Folgen hat nicht geklappt.");
      return;
    }

    const nextFollow = { followerId: activeProfile.id, followingId: viewProfile.id };
    setFollows((currentFollows) =>
      isFollowingViewProfile
        ? currentFollows.filter(
            (follow) => !(follow.followerId === nextFollow.followerId && follow.followingId === nextFollow.followingId)
          )
        : currentFollows.some(
              (follow) => follow.followerId === nextFollow.followerId && follow.followingId === nextFollow.followingId
            )
          ? currentFollows
          : [...currentFollows, nextFollow]
    );
    setFollowPulse(true);
    window.setTimeout(() => setFollowPulse(false), 520);
    notify(isFollowingViewProfile ? "Nicht mehr gefolgt." : `${viewProfile.name} wird gefolgt.`);
    await loadWalls(false);
  }

  async function addComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("comment") || "").trim();

    if (!text) return;

    const response = await fetch("/api/walls/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, text })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Kommentar konnte nicht gespeichert werden.");
      return;
    }

    form.reset();
    notify("Kommentar gespeichert.");
    await loadWalls(false);
  }

  async function deleteProfile() {
    if (!isAdmin || !viewProfile || viewProfile.id === "kimon") return;
    const ok = window.confirm(`${viewProfile.name} wirklich loeschen?`);
    if (!ok) return;

    const response = await fetch("/api/walls/profiles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: viewProfile.id })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Profil konnte nicht geloescht werden.");
      return;
    }

    notify("Profil geloescht.");
    setEditProfileOpen(false);
    setViewProfileId(activeProfile?.id || "");
    await loadWalls(false);
  }

  function openProfile(profileId?: string) {
    if (!profileId) return;
    setViewProfileId(profileId);
    setShowFishPage(false);
  }

  function openNotification(note: { profileId: string; postId: string }) {
    openProfile(note.profileId);
    if (note.postId) {
      setHighlightedPostId(note.postId);
      window.setTimeout(() => {
        document.getElementById(`fish-post-${note.postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  }

  function toggleNotifications() {
    setNotificationsOpen((value) => !value);
    setSeenNotifications(notifications.length);
  }

  function toggleMusic(src?: string) {
    const audio = audioRef.current;
    if (!audio) return;

    if (src) {
      const trackIndex = tracks.findIndex((track) => track.src === src);
      if (trackIndex >= 0) setActiveTrack(trackIndex);
    }

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function nextTrack() {
    setActiveTrack((currentTrack) => (currentTrack + 1) % tracks.length);
  }

  const wallStyle =
    viewProfile &&
    ({
      "--wall-a": viewProfile.accentColor,
      "--wall-b": viewProfile.backgroundColor
    } as CSSProperties);

  function renderVerified(profile?: Profile | null) {
    if (!profile?.verified) return null;

    return (
      <span className="verified-badge" title="Diese Person ist verifiziert." aria-label="Diese Person ist verifiziert.">
        ✓
      </span>
    );
  }

  function renderPost(post: WallPost) {
    const author = profiles.find((profile) => profile.id === post.authorId);
    const target = profiles.find((profile) => profile.id === post.targetId);
    const collaborator = profiles.find((profile) => profile.id === post.collaboratorId);
    const postComments = commentsByPost[post.id] || [];
    const isOnOtherProfile = author && target && author.id !== target.id;

    return (
      <article
        id={`fish-post-${post.id}`}
        className={`wall-post post-${post.postType} ${highlightedPostId === post.id ? "highlighted" : ""}`}
        key={post.id}
        style={{ "--pin-color": post.color } as CSSProperties}
      >
        <div className="post-route">
          <button type="button" onClick={() => openProfile(author?.id)}>
            {author?.name || "Unbekannt"} {renderVerified(author)}
          </button>
          {isOnOtherProfile && (
            <>
              <span>auf</span>
              <button type="button" onClick={() => openProfile(target?.id)}>
                {target?.name || "Profil"} {renderVerified(target)}
              </button>
            </>
          )}
          {collaborator && (
            <>
              <span>mit</span>
              <button type="button" onClick={() => openProfile(collaborator.id)}>
                {collaborator.name} {renderVerified(collaborator)}
              </button>
            </>
          )}
        </div>
        <strong>{post.sticker}</strong>
        {post.postType === "image" && post.mediaUrl && (
          <img className="post-image" src={post.mediaUrl} alt={post.text || "Bild-.fish"} />
        )}
        {post.postType === "song" && (
          <div className="post-song">
            <b>
              {post.songTitle} - {post.songArtist}
            </b>
            <button onClick={() => toggleMusic(post.songSrc)}>Abspielen</button>
          </div>
        )}
        <p>{post.text}</p>
        <span>{new Date(post.createdAt).toLocaleString("de-DE")}</span>

        <div className="fish-comments">
          {postComments.map((comment) => {
            const commentAuthor = profiles.find((profile) => profile.id === comment.authorId);
            return (
              <div className="fish-comment" key={comment.id}>
                <button type="button" onClick={() => openProfile(commentAuthor?.id)}>
                  {commentAuthor?.name || "Unbekannt"} {renderVerified(commentAuthor)}
                </button>
                <span>{comment.text}</span>
              </div>
            );
          })}
          <form className="comment-form" onSubmit={(event) => addComment(event, post.id)}>
            <input name="comment" placeholder="Kommentieren..." />
            <button type="submit">Senden</button>
          </form>
        </div>
      </article>
    );
  }

  return (
    <main className="walls-page">
      <audio
        ref={audioRef}
        src={tracks[activeTrack].src}
        onEnded={nextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <nav className="topbar" aria-label=".fish Navigation">
        <div>
          <a href="/">Zur Partyseite</a>
          {activeProfile && <a href="#wall">.fish</a>}
        </div>
      </nav>

      <section className="section walls-hero">
        <div className="snow-window">
          <div className="window-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="eyebrow">.fish</p>
          <h1>.fish</h1>
          <p className="hero-copy">
            Retro-Profile, Fotos, Pins, Playlist-Songs und echte gegenseitige Freundschaften. Erst einloggen oder
            registrieren, dann öffnet sich dein Bereich.
          </p>
        </div>
      </section>

      {!activeProfile && (
        <section className="section walls-auth">
          <div className="snow-window">
            <form className="form wall-auth-form" onSubmit={login}>
              <p className="eyebrow">.fish Account</p>
              <h2>Einloggen</h2>
              <label>
                Nutzername
                <input
                  value={loginHandle}
                  onChange={(event) => setLoginHandle(event.target.value)}
                  placeholder="dein Nutzername"
                  required
                />
              </label>
              <label>
                Passwort
                <input
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  type="password"
                  placeholder="dein Passwort"
                  required
                />
              </label>
              <button className="aqua-button">Einloggen</button>
            </form>

            <div className="fish-create-panel">
              <button
                className="secondary-button fish-create-toggle"
                type="button"
                onClick={() => setShowCreateFish((value) => !value)}
              >
                {showCreateFish ? ".fish erstellen schließen" : "Neues .fish erstellen"}
              </button>

              {showCreateFish && (
                <form className="form wall-auth-form fish-register-panel" onSubmit={createProfile}>
                  <p className="eyebrow">Neu auf .fish</p>
                  <h2>.fish erstellen</h2>
                  <label>
                    Name
                    <input name="name" required placeholder="Dein Name" />
                  </label>
                  <label>
                    Nutzername
                    <input name="handle" required placeholder="z. B. louki2003" />
                  </label>
                  <label>
                    Passwort
                    <input name="password" type="password" required placeholder="Nicht dein wichtiges Passwort nutzen" />
                  </label>
                  <label>
                    Profilbild
                    <input name="avatar" type="file" accept="image/*" />
                  </label>
                  <label>
                    Überschrift
                    <input name="headline" placeholder="z. B. Loukis .fish" />
                  </label>
                  <label>
                    Bio
                    <textarea name="bio" placeholder="Was soll auf deiner .fish stehen?" />
                  </label>
                  <label>
                    Farbe
                    <select name="theme" defaultValue="blue">
                      {themeOptions.map((theme) => (
                        <option value={theme.value} key={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hintergrundfarbe
                    <input name="backgroundColor" type="color" defaultValue="#dcecff" />
                  </label>
                  <label>
                    Akzentfarbe
                    <input name="accentColor" type="color" defaultValue="#66b9f1" />
                  </label>
                  <label>
                    Muster
                    <select name="pattern" defaultValue="aqua">
                      {patternOptions.map((pattern) => (
                        <option value={pattern.value} key={pattern.value}>
                          {pattern.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="check-label">
                    <input name="glitter" type="checkbox" defaultChecked />
                    Glitzer-Modus aktivieren
                  </label>
                  <button className="aqua-button">.fish erstellen</button>
                </form>
              )}
            </div>
            {loading && <p>.fish Profile werden geladen...</p>}
          </div>
        </section>
      )}

      {activeProfile && viewProfile && (
        <>
          <aside className={`wall-music-player ${playerCollapsed ? "collapsed" : ""}`}>
            <button
              className="player-collapse"
              type="button"
              onClick={() => setPlayerCollapsed((value) => !value)}
              aria-label={playerCollapsed ? "Player ausklappen" : "Player einklappen"}
            >
              {playerCollapsed ? "▲" : "▼"}
            </button>
            {!playerCollapsed && (
              <>
                <strong>.fish Player</strong>
                <span>
                  {tracks[activeTrack].title} - {tracks[activeTrack].artist}
                </span>
                <div className="ipod-controls-mini">
                  <button onClick={nextTrack}>◀</button>
                  <button className="mini-play" onClick={() => toggleMusic()}>
                    {isPlaying ? "Ⅱ" : "▶"}
                  </button>
                  <button onClick={nextTrack}>▶</button>
                </div>
              </>
            )}
          </aside>

          <button className="fish-dock-toggle" type="button" onClick={() => setSideMenuOpen((value) => !value)}>
            {sideMenuOpen ? "Menu schliessen" : ".fish Menu"}
          </button>

          <button className="fish-bell" type="button" onClick={toggleNotifications} aria-label="Benachrichtigungen">
            bell
            {Math.max(0, notifications.length - seenNotifications) > 0 && (
              <span>{Math.max(0, notifications.length - seenNotifications)}</span>
            )}
          </button>

          {notificationsOpen && (
            <aside className="fish-notification-popover">
              <strong>Benachrichtigungen</strong>
              {notifications.length ? (
                notifications.map((note) => (
                  <button type="button" key={note.id} onClick={() => openNotification(note)}>
                    {note.text}
                  </button>
                ))
              ) : (
                <span>Noch nichts Neues.</span>
              )}
            </aside>
          )}

          <aside className={`fish-side-dock ${sideMenuOpen ? "open" : ""}`}>
            <p className="eyebrow">.fish Menu</p>
            <div className="wall-profile-list">
              <button className="active" type="button">
                <span className="mini-avatar">
                  {activeProfile.avatar ? <img src={activeProfile.avatar} alt="" /> : activeProfile.name[0]}
                </span>
                <span>{activeProfile.name}</span>
              </button>
            </div>
            {isAdmin ? (
              <div className="fish-admin-box admin-on">
                <strong>Admin aktiv</strong>
                <span>Du bearbeitest das geöffnete .fish.</span>
                <button className="secondary-button" type="button" onClick={adminLogout}>
                  Admin aus
                </button>
              </div>
            ) : (
              <form className="fish-admin-box" onSubmit={adminLogin}>
                <label>
                  Admin
                  <input
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    type="password"
                    placeholder="Admin-Passwort"
                  />
                </label>
                <button className="secondary-button">Admin Login</button>
              </form>
            )}
            <button className="secondary-button" type="button" onClick={logout}>
              Ausloggen
            </button>
            <div className="fish-notifications">
              <strong>Benachrichtigungen</strong>
              {notifications.length ? (
                notifications.map((note) => (
                  <button type="button" key={note.id} onClick={() => openNotification(note)}>
                    {note.text}
                  </button>
                ))
              ) : (
                <span>Noch nichts Neues.</span>
              )}
            </div>
          </aside>

          <section
            id="wall"
            className={`section wall-stage theme-${viewProfile.theme} pattern-${viewProfile.pattern} font-${viewProfile.fontStyle} density-${viewProfile.layoutDensity} ${
              viewProfile.glitter ? "glitter-on" : ""
            }`}
            style={wallStyle || undefined}
          >
            <aside className="wall-directory">
              <p className="eyebrow">Alle .fish Profile</p>
              <button className={showFishPage ? "active" : ""} onClick={() => setShowFishPage(true)}>
                .fishpage
              </button>
              <input
                className="fish-search"
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder=".fish suchen"
              />
              {visibleProfiles.map((profile) => (
                <button
                  className={profile.id === viewProfile.id ? "active" : ""}
                  key={profile.id}
                  onClick={() => openProfile(profile.id)}
                >
                  {profile.name} {renderVerified(profile)}
                </button>
              ))}
              {!visibleProfiles.length && <p>Kein .fish gefunden.</p>}
            </aside>

            {showFishPage ? (
              <article className="myspace-card fishpage-card">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>.fishpage</strong>
                </div>
                <div className="fishpage-body">
                  <div>
                    <p className="eyebrow">Neueste .fishs</p>
                    <h2>.fishpage</h2>
                    <p>Hier siehst du die neuesten .fishs von allen anderen in zeitlicher Reihenfolge.</p>
                  </div>
                  <article className="wall-post party-news-post">
                    <div className="post-route">
                      <button type="button">Kimon {renderVerified(profiles.find((profile) => profile.id === "kimon"))}</button>
                      <span>posted</span>
                    </div>
                    <strong>Party Website</strong>
                    <p>
                      Kimon's 23. Geburtstag: 27.06.2026, 19:00, Wendelinstraße 94. Dresscode schick, aber entspannt.
                    </p>
                    <a className="secondary-button party-news-link" href="/party">
                      Party-Website öffnen
                    </a>
                  </article>
                  <div className="wall-posts">
                    {fishPagePosts.length ? fishPagePosts.map((post) => renderPost(post)) : <p>Noch keine fremden .fishs da.</p>}
                  </div>
                </div>
              </article>
            ) : (
            <article className="myspace-card">
              <div className="myspace-topbar">
                <span />
                <span />
                <span />
                <strong>{viewProfile.headline || `${viewProfile.name}s .fish`}</strong>
              </div>

              <div className="profile-grid">
                <div className="profile-sidebar">
                  <div className="profile-avatar">
                    {viewProfile.avatar ? <img src={viewProfile.avatar} alt={viewProfile.name} /> : viewProfile.name[0]}
                  </div>
                  <h2>{viewProfile.name}</h2>
                  <p>
                    @{viewProfile.handle} {renderVerified(viewProfile)}
                  </p>
                  {editableProfile && (
                    <button className="secondary-button profile-edit-button" onClick={() => setEditProfileOpen(true)}>
                      Profil bearbeiten
                    </button>
                  )}
                  {activeProfile.id !== viewProfile.id && (
                    <button className={`aqua-button follow-button ${followPulse ? "pulse" : ""}`} onClick={toggleFollow}>
                      {isFollowingViewProfile ? "Gefolgt" : "Folgen"}
                    </button>
                  )}
                </div>

                <div className="profile-main">
                  <section className="wall-box">
                    <h3>Über mich</h3>
                    <p>{viewProfile.bio}</p>
                  </section>

                  <section className="wall-box">
                    <h3>Top Freunde</h3>
                    <div className="top-friends">
                      {mutualFriends.length ? (
                        mutualFriends.map((friend) => (
                          <button key={friend.id} onClick={() => openProfile(friend.id)}>
                            <span className="mini-avatar">
                              {friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name[0]}
                            </span>
                            <span>{friend.name} {renderVerified(friend)}</span>
                          </button>
                        ))
                      ) : (
                        <p>Top Freunde erscheinen erst, wenn beide Profile sich gegenseitig folgen.</p>
                      )}
                    </div>
                  </section>

                  <section className="wall-box">
                    <div className="feed-heading">
                      <h3>Feed</h3>
                      <button className="aqua-button compact-button" onClick={() => setNewFishOpen(true)}>
                        Neues .fish
                      </button>
                    </div>
                    <div className="wall-posts">
                      {wallPosts.length ? (
                        wallPosts.map((post) => renderPost(post))
                      ) : (
                        <p>Noch nichts angepinnt. Sei die erste Person.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </article>
            )}
          </section>

          {newFishOpen && (
            <div className="fish-modal-backdrop" role="dialog" aria-modal="true">
              <div className="fish-modal snow-window">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>Neues .fish</strong>
                </div>
                <div className="fish-modal-body">
                  <div className="fish-type-tabs">
                    <button className={fishType === "text" ? "active" : ""} onClick={() => setFishType("text")}>
                      Text
                    </button>
                    <button className={fishType === "image" ? "active" : ""} onClick={() => setFishType("image")}>
                      Bild
                    </button>
                    <button className={fishType === "song" ? "active" : ""} onClick={() => setFishType("song")}>
                      Song
                    </button>
                  </div>

                  {fishType === "text" && (
                    <form className="pin-form" onSubmit={pinText}>
                      <label>
                        Text-.fish
                        <textarea name="text" placeholder={`Schreib etwas in ${viewProfile.name}s Feed`} required />
                      </label>
                      <label>
                        Stil
                        <select name="sticker" defaultValue={stickerOptions[0]}>
                          {stickerOptions.map((sticker) => (
                            <option key={sticker}>{sticker}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#ffffff" />
                      </label>
                      <button className="aqua-button">Text-.fish posten</button>
                    </form>
                  )}

                  {fishType === "image" && (
                    <form className="pin-form" onSubmit={pinImage}>
                      <label>
                        Bild-.fish
                        <input name="image" type="file" accept="image/*" required />
                      </label>
                      <label>
                        Caption
                        <input name="text" placeholder="Kurzer Text zum Bild" />
                      </label>
                      <label>
                        Stil
                        <select name="sticker" defaultValue="Collab .fish">
                          <option>Collab .fish</option>
                          {stickerOptions.map((sticker) => (
                            <option key={sticker}>{sticker}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#fff8dc" />
                      </label>
                      <button className="aqua-button">Bild-.fish posten</button>
                    </form>
                  )}

                  {fishType === "song" && (
                    <form className="pin-form" onSubmit={pinSong}>
                      <label>
                        Song-.fish
                        <select name="track" defaultValue="0">
                          {tracks.map((track, index) => (
                            <option value={index} key={track.src}>
                              {track.title} - {track.artist}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Kommentar
                        <input name="text" placeholder="Warum dieser Song?" />
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#eef6ff" />
                      </label>
                      <button className="aqua-button">Song-.fish posten</button>
                    </form>
                  )}

                  <button className="secondary-button modal-close" type="button" onClick={() => setNewFishOpen(false)}>
                    Schliessen
                  </button>
                </div>
              </div>
            </div>
          )}

          {editProfileOpen && editableProfile && (
            <div className="fish-modal-backdrop" role="dialog" aria-modal="true">
              <div className="fish-modal fish-modal-wide snow-window">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>
                    {isAdmin && editableProfile.id !== activeProfile.id ? "Admin: .fish bearbeiten" : "Profil bearbeiten"}
                  </strong>
                </div>
                <div className="fish-modal-body">
                  <form className="pin-form profile-edit-grid" onSubmit={saveStyle}>
                    <label>
                      Überschrift
                      <input name="headline" defaultValue={editableProfile.headline} />
                    </label>
                    <label>
                      Bio
                      <textarea name="bio" defaultValue={editableProfile.bio} />
                    </label>
                    <label>
                      Theme
                      <select name="theme" defaultValue={editableProfile.theme}>
                        {themeOptions.map((theme) => (
                          <option value={theme.value} key={theme.value}>
                            {theme.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Hintergrund
                      <input name="backgroundColor" type="color" defaultValue={editableProfile.backgroundColor} />
                    </label>
                    <label>
                      Akzent
                      <input name="accentColor" type="color" defaultValue={editableProfile.accentColor} />
                    </label>
                    <label>
                      Muster
                      <select name="pattern" defaultValue={editableProfile.pattern}>
                        {patternOptions.map((pattern) => (
                          <option value={pattern.value} key={pattern.value}>
                            {pattern.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Schrift
                      <select name="fontStyle" defaultValue={editableProfile.fontStyle}>
                        {fontOptions.map((font) => (
                          <option value={font.value} key={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Layout
                      <select name="layoutDensity" defaultValue={editableProfile.layoutDensity}>
                        {densityOptions.map((density) => (
                          <option value={density.value} key={density.value}>
                            {density.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="check-label">
                      <input name="glitter" type="checkbox" defaultChecked={editableProfile.glitter} />
                      Glitzer-Modus
                    </label>
                    {isAdmin && (
                      <label className="check-label">
                        <input name="verified" type="checkbox" defaultChecked={editableProfile.verified} />
                        Blauer Verifizierungshaken
                      </label>
                    )}
                    <div className="modal-actions">
                      <button className="aqua-button">Speichern</button>
                      {isAdmin && editableProfile.id !== "kimon" && (
                        <button className="danger-button" type="button" onClick={deleteProfile}>
                          Profil loeschen
                        </button>
                      )}
                      <button className="secondary-button" type="button" onClick={() => setEditProfileOpen(false)}>
                        Schliessen
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {toast && <div className="fish-toast">{toast}</div>}
    </main>
  );
}
