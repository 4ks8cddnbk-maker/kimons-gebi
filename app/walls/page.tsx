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
            .filter((post) => post.targetId === viewProfile.id || post.collaboratorId === viewProfile.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [posts, viewProfile]
  );
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
      const profilesData = await profilesResponse.json();
      const postsData = await postsResponse.json();
      const nextProfiles = profilesData.profiles || [];
      const nextActiveProfileId = profilesData.activeProfileId || "";

      setProfiles(nextProfiles);
      setFollows(profilesData.follows || []);
      setPosts(postsData.posts || []);
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
    notify("Ausgeloggt.");
    await loadWalls();
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
    await loadWalls(false);
  }

  async function createPost(payload: Partial<WallPost>) {
    if (!viewProfile) return;

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
      return;
    }

    await loadWalls(false);
  }

  async function pinText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) return;

    notify(".fish wird gespeichert...");
    await createPost({
      postType: "text",
      text,
      sticker: String(formData.get("sticker") || stickerOptions[0]),
      color: String(formData.get("color") || "#ffffff")
    } as WallPost);
    notify("Neues .fish gespeichert.");
    form.reset();
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
      await createPost({
        postType: "image",
        text: text || "Bild-Pin",
        sticker: "Collab Pin",
        color: String(formData.get("color") || "#ffffff"),
        mediaUrl: upload.urls[0],
        collaboratorId: viewProfile.id !== activeProfile.id ? viewProfile.id : ""
      } as WallPost);
      notify("Bild als Collab-.fish gespeichert.");
      form.reset();
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
    await createPost({
      postType: "song",
      text: String(formData.get("text") || "Song aus der Party-Playlist"),
      sticker: "iPod Approved",
      color: String(formData.get("color") || "#eef6ff"),
      songTitle: track.title,
      songArtist: track.artist,
      songSrc: track.src
    } as WallPost);
    notify("Song als neues .fish gespeichert.");
    form.reset();
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

    notify(isFollowingViewProfile ? "Nicht mehr gefolgt." : "Gefolgt.");
    await loadWalls(false);
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
          <aside className="wall-music-player">
            <strong>.fish Player</strong>
            <span>
              {tracks[activeTrack].title} - {tracks[activeTrack].artist}
            </span>
            <div>
              <button onClick={() => toggleMusic()}>{isPlaying ? "Pause" : "Play"}</button>
              <button onClick={nextTrack}>Next</button>
            </div>
          </aside>

          <section className="section wall-account-bar">
            <div className="snow-window wall-switcher">
              <p className="eyebrow">Eingeloggt als</p>
              <div className="wall-profile-list">
                <button className="active" type="button">
                  <span className="mini-avatar">
                    {activeProfile.avatar ? <img src={activeProfile.avatar} alt="" /> : activeProfile.name[0]}
                  </span>
                  <span>{activeProfile.name}</span>
                </button>
              </div>
              <label className="photo-drop">
                Bilder auf meine Pinnwand laden
                <input type="file" accept="image/*" multiple onChange={uploadPhotos} />
              </label>
              {isAdmin ? (
                <div className="fish-admin-box admin-on">
                  <strong>Admin aktiv</strong>
                  <span>Du bearbeitest das geöffnete .fish.</span>
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
                  <button className="secondary-button">Admin</button>
                </form>
              )}
              <button className="secondary-button" type="button" onClick={logout}>
                Ausloggen
              </button>
            </div>
          </section>

          <section
            id="wall"
            className={`section wall-stage theme-${viewProfile.theme} pattern-${viewProfile.pattern} font-${viewProfile.fontStyle} density-${viewProfile.layoutDensity} ${
              viewProfile.glitter ? "glitter-on" : ""
            }`}
            style={wallStyle || undefined}
          >
            <aside className="wall-directory">
              <p className="eyebrow">Alle .fish Profile</p>
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
                  onClick={() => setViewProfileId(profile.id)}
                >
                  {profile.name}
                </button>
              ))}
              {!visibleProfiles.length && <p>Kein .fish gefunden.</p>}
            </aside>

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
                  <p>@{viewProfile.handle}</p>
                  <div className="status-pill">Status: {viewProfile.mood}</div>
                  <div className="profile-song">Profil-Song: {viewProfile.song}</div>
                  {activeProfile.id !== viewProfile.id && (
                    <button className="aqua-button follow-button" onClick={toggleFollow}>
                      {isFollowingViewProfile ? "Gefolgt" : "Folgen"}
                    </button>
                  )}
                </div>

                <div className="profile-main">
                  <section className="wall-box">
                    <h3>Über mich</h3>
                    <p>{viewProfile.bio}</p>
                  </section>

                  {editableProfile && (
                    <section className="wall-box">
                      <h3>{isAdmin && editableProfile.id !== activeProfile.id ? "Admin: .fish bearbeiten" : "Meine .fish stylen"}</h3>
                      <form className="pin-form" onSubmit={saveStyle}>
                        <label>
                          Überschrift
                          <input name="headline" defaultValue={editableProfile.headline} />
                        </label>
                        <label>
                          Status
                          <input name="mood" defaultValue={editableProfile.mood} />
                        </label>
                        <label>
                          Profil-Song
                          <input name="song" defaultValue={editableProfile.song} />
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
                        <button className="aqua-button">Style speichern</button>
                      </form>
                    </section>
                  )}

                  <section className="wall-box">
                    <h3>Top Freunde</h3>
                    <div className="top-friends">
                      {mutualFriends.length ? (
                        mutualFriends.map((friend) => (
                          <button key={friend.id} onClick={() => setViewProfileId(friend.id)}>
                            <span className="mini-avatar">
                              {friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name[0]}
                            </span>
                            <span>{friend.name}</span>
                          </button>
                        ))
                      ) : (
                        <p>Top Freunde erscheinen erst, wenn beide Profile sich gegenseitig folgen.</p>
                      )}
                    </div>
                  </section>

                  <section className="wall-box">
                    <h3>Bilder</h3>
                    {viewProfile.photos.length ? (
                      <div className="wall-photos">
                        {viewProfile.photos.map((photo, index) => (
                          <img src={photo} alt={`${viewProfile.name} Foto ${index + 1}`} key={`${photo}-${index}`} />
                        ))}
                      </div>
                    ) : (
                      <p>Noch keine Bilder hochgeladen.</p>
                    )}
                  </section>

                  <section className="wall-box">
                    <h3>Neues .fish erstellen</h3>
                    <form className="pin-form" onSubmit={pinText}>
                      <label>
                        Nachricht
                        <textarea name="text" placeholder={`Schreib etwas auf ${viewProfile.name}s Wand`} required />
                      </label>
                      <label>
                        Sticker
                        <select name="sticker" defaultValue={stickerOptions[0]}>
                          {stickerOptions.map((sticker) => (
                            <option key={sticker}>{sticker}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Pin-Farbe
                        <input name="color" type="color" defaultValue="#ffffff" />
                      </label>
                      <button className="aqua-button">Text-.fish erstellen</button>
                    </form>

                    <form className="pin-form sub-pin-form" onSubmit={pinImage}>
                      <label>
                        Bild als Collab-Pin
                        <input name="image" type="file" accept="image/*" />
                      </label>
                      <label>
                        Caption
                        <input name="text" placeholder="Kurzer Text zum Bild" />
                      </label>
                      <label>
                        Pin-Farbe
                        <input name="color" type="color" defaultValue="#fff8dc" />
                      </label>
                      <button className="secondary-button">Bild pinnen</button>
                    </form>

                    <form className="pin-form sub-pin-form" onSubmit={pinSong}>
                      <label>
                        iPod-Song als .fish
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
                        Pin-Farbe
                        <input name="color" type="color" defaultValue="#eef6ff" />
                      </label>
                      <button className="secondary-button">Song-.fish erstellen</button>
                    </form>
                  </section>

                  <section className="wall-box">
                    <h3>Wand</h3>
                    <div className="wall-posts">
                      {wallPosts.length ? (
                        wallPosts.map((post) => {
                          const author = profiles.find((profile) => profile.id === post.authorId);
                          const collaborator = profiles.find((profile) => profile.id === post.collaboratorId);
                          return (
                            <article
                              className={`wall-post post-${post.postType}`}
                              key={post.id}
                              style={{ "--pin-color": post.color } as CSSProperties}
                            >
                              <strong>{post.sticker}</strong>
                              {post.postType === "image" && post.mediaUrl && (
                                <img className="post-image" src={post.mediaUrl} alt={post.text || "Bild-Pin"} />
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
                              <span>
                                Von {author?.name || "Unbekannt"}
                                {collaborator ? ` · Collab mit ${collaborator.name}` : ""} ·{" "}
                                {new Date(post.createdAt).toLocaleString("de-DE")}
                              </span>
                            </article>
                          );
                        })
                      ) : (
                        <p>Noch nichts angepinnt. Sei die erste Person.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
      {toast && <div className="fish-toast">{toast}</div>}
    </main>
  );
}
