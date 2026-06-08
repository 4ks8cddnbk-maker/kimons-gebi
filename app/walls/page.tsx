"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type WallPost = {
  id: string;
  authorId: string;
  targetId: string;
  text: string;
  sticker: string;
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
  photos: string[];
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
  "Party Pin",
  "Snow Leopard",
  "Glitter Comment",
  "Top 8 Energy",
  "Afterparty Seal",
  "iPod Approved",
  "Main Character"
];
const themeOptions = [
  { value: "blue", label: "Aqua Blau" },
  { value: "green", label: "Limewire Gruen" },
  { value: "pink", label: "MySpace Pink" },
  { value: "gold", label: "iPod Gold" },
  { value: "purple", label: "Neon Lila" },
  { value: "black", label: "Black Chrome" }
];
const patternOptions = [
  { value: "aqua", label: "Aqua Streifen" },
  { value: "stars", label: "Sterne" },
  { value: "checker", label: "Checkerboard" },
  { value: "hearts", label: "Hearts" },
  { value: "scanlines", label: "CRT Lines" }
];
const stickerPackOptions = [
  { value: "party", label: "Party Sticker" },
  { value: "glam", label: "Glam Sticker" },
  { value: "retro", label: "Retro Web" },
  { value: "karaoke", label: "Karaoke Pack" }
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
  const [activeProfileId, setActiveProfileId] = useState("");
  const [viewProfileId, setViewProfileId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
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
            .filter((post) => post.targetId === viewProfile.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [posts, viewProfile]
  );
  const topFriends = viewProfile ? profiles.filter((profile) => profile.id !== viewProfile.id).slice(0, 6) : [];

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
      setPosts(postsData.posts || []);
      setActiveProfileId(nextActiveProfileId);
      setViewProfileId((currentId) => {
        if (currentId && nextProfiles.some((profile: Profile) => profile.id === currentId)) return currentId;
        return nextActiveProfileId || "";
      });

      if (!profilesResponse.ok || !postsResponse.ok) {
        setStatus(profilesData.message || postsData.message || "Pinnwände konnten nicht geladen werden.");
      }
    } catch {
      setStatus("Pinnwände konnten nicht geladen werden.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

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
    setStatus("Login wird geprüft...");

    const response = await fetch("/api/walls/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: normalizeHandle(loginHandle), password: loginPassword })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || "Login stimmt nicht.");
      return;
    }

    setLoginHandle("");
    setLoginPassword("");
    setStatus("Eingeloggt.");
    await loadWalls();
  }

  async function logout() {
    await fetch("/api/walls/login", { method: "DELETE" });
    setActiveProfileId("");
    setViewProfileId("");
    setStatus("Ausgeloggt.");
    await loadWalls();
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("avatar");
    const name = String(formData.get("name") || "").trim();
    const handle = normalizeHandle(String(formData.get("handle") || name));
    const password = String(formData.get("password") || "");

    if (!name || !handle || !password) {
      setStatus("Bitte Name, Nutzername und Passwort eintragen.");
      return;
    }

    setStatus("Account wird erstellt...");

    let avatar = "";

    try {
      if (file instanceof File && file.size) {
        const upload = await uploadFiles([file]);
        avatar = upload.urls[0] || "";
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Profilbild konnte nicht hochgeladen werden.");
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
      theme: String(formData.get("theme") || "blue"),
      pattern: String(formData.get("pattern") || "aqua"),
      stickerPack: String(formData.get("stickerPack") || "party"),
      headline: String(formData.get("headline") || `${name}s Pinnwand`),
      glitter: formData.get("glitter") === "on",
      photos: []
    };

    const response = await fetch("/api/walls/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, password })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || "Account konnte nicht gespeichert werden.");
      return;
    }

    setStatus("Account erstellt und eingeloggt.");
    form.reset();
    await loadWalls();
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    setStatus("Bild(er) werden hochgeladen...");

    try {
      const data = await uploadFiles(files);
      setStatus(data.message || "Bild(er) auf deine Pinnwand gelegt.");
      event.target.value = "";
      await loadWalls(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function saveStyle(event: FormEvent<HTMLFormElement>) {
    if (!activeProfile) return;

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setStatus("Style wird gespeichert...");

    const payload = {
      headline: String(formData.get("headline") || activeProfile.headline),
      bio: String(formData.get("bio") || activeProfile.bio),
      mood: String(formData.get("mood") || activeProfile.mood),
      song: String(formData.get("song") || activeProfile.song),
      theme: String(formData.get("theme") || activeProfile.theme),
      pattern: String(formData.get("pattern") || activeProfile.pattern),
      stickerPack: String(formData.get("stickerPack") || activeProfile.stickerPack),
      glitter: formData.get("glitter") === "on"
    };

    const response = await fetch("/api/walls/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || "Style konnte nicht gespeichert werden.");
      return;
    }

    setStatus("Style gespeichert.");
    await loadWalls(false);
  }

  async function pinPost(event: FormEvent<HTMLFormElement>) {
    if (!viewProfile) return;

    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) return;

    setStatus("Pin wird gespeichert...");

    const response = await fetch("/api/walls/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: viewProfile.id,
        text,
        sticker: String(formData.get("sticker") || stickerOptions[0])
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || "Pin konnte nicht gespeichert werden.");
      return;
    }

    setStatus(`Auf ${viewProfile.name}s Pinnwand gepinnt.`);
    form.reset();
    await loadWalls(false);
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [activeTrack, isPlaying]);

  return (
    <main className="walls-page">
      <audio
        ref={audioRef}
        src={tracks[activeTrack].src}
        onEnded={nextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <nav className="topbar" aria-label="Pinnwand Navigation">
        <div>
          <a href="/">Zur Partyseite</a>
          {activeProfile && <a href="#wall">Pinnwände</a>}
        </div>
      </nav>

      <section className="section walls-hero">
        <div className="snow-window">
          <div className="window-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="eyebrow">KimonSpace</p>
          <h1>Pinnwände</h1>
          <p className="hero-copy">
            Retro-Profile, Fotos, Pins und ein bisschen MySpace-Gefühl. Erst einloggen oder registrieren, dann
            öffnet sich der Pinnwand-Bereich.
          </p>
        </div>
      </section>

      <section className="section walls-auth">
        <div className="snow-window">
          <div className="auth-tabs">
            <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
              Einloggen
            </button>
            <button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>
              Registrieren
            </button>
          </div>

          {authMode === "login" ? (
            <form className="form wall-auth-form" onSubmit={login}>
              <p className="eyebrow">Account</p>
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
          ) : (
            <form className="form wall-auth-form" onSubmit={createProfile}>
              <p className="eyebrow">Neu hier</p>
              <h2>Registrieren</h2>
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
                <input name="headline" placeholder="z. B. Loukis Ecke im Internet" />
              </label>
              <label>
                Status
                <input name="mood" placeholder="z. B. bereit fuer Karaoke" />
              </label>
              <label>
                Profil-Song
                <input name="song" placeholder="Dein Song des Abends" />
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
                Muster
                <select name="pattern" defaultValue="aqua">
                  {patternOptions.map((pattern) => (
                    <option value={pattern.value} key={pattern.value}>
                      {pattern.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sticker-Pack
                <select name="stickerPack" defaultValue="party">
                  {stickerPackOptions.map((pack) => (
                    <option value={pack.value} key={pack.value}>
                      {pack.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-label">
                <input name="glitter" type="checkbox" defaultChecked />
                Glitzer-Modus aktivieren
              </label>
              <label>
                Kurzer Text
                <textarea name="bio" placeholder="Was soll auf deiner Pinnwand stehen?" />
              </label>
              <button className="aqua-button">Account erstellen</button>
            </form>
          )}
          {loading && <p>Pinnwände werden geladen...</p>}
          {status && <p className="form-message done">{status}</p>}
        </div>
      </section>

      {activeProfile && viewProfile && (
        <>
          <aside className="wall-music-player">
            <strong>KimonSpace Player</strong>
            <span>
              {tracks[activeTrack].title} - {tracks[activeTrack].artist}
            </span>
            <div>
              <button onClick={toggleMusic}>{isPlaying ? "Pause" : "Play"}</button>
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
              <button className="secondary-button" type="button" onClick={logout}>
                Ausloggen
              </button>
            </div>
          </section>

          <section
            id="wall"
            className={`section wall-stage theme-${viewProfile.theme} pattern-${viewProfile.pattern} ${
              viewProfile.glitter ? "glitter-on" : ""
            } pack-${viewProfile.stickerPack}`}
          >
            <aside className="wall-directory">
              <p className="eyebrow">Alle Pinnwände</p>
              {profiles.map((profile) => (
                <button
                  className={profile.id === viewProfile.id ? "active" : ""}
                  key={profile.id}
                  onClick={() => setViewProfileId(profile.id)}
                >
                  {profile.name}
                </button>
              ))}
            </aside>

            <article className="myspace-card">
              <div className="myspace-topbar">
                <span />
                <span />
                <span />
                <strong>{viewProfile.headline || `${viewProfile.name}s Pinnwand`}</strong>
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
                  <div className="profile-stickers" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="profile-main">
                  <section className="wall-box">
                    <h3>Über mich</h3>
                    <p>{viewProfile.bio}</p>
                  </section>

                  {activeProfile.id === viewProfile.id && (
                    <section className="wall-box">
                      <h3>Meine Wand stylen</h3>
                      <form className="pin-form" onSubmit={saveStyle}>
                        <label>
                          Überschrift
                          <input name="headline" defaultValue={activeProfile.headline} />
                        </label>
                        <label>
                          Status
                          <input name="mood" defaultValue={activeProfile.mood} />
                        </label>
                        <label>
                          Profil-Song
                          <input name="song" defaultValue={activeProfile.song} />
                        </label>
                        <label>
                          Bio
                          <textarea name="bio" defaultValue={activeProfile.bio} />
                        </label>
                        <label>
                          Farbe
                          <select name="theme" defaultValue={activeProfile.theme}>
                            {themeOptions.map((theme) => (
                              <option value={theme.value} key={theme.value}>
                                {theme.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Muster
                          <select name="pattern" defaultValue={activeProfile.pattern}>
                            {patternOptions.map((pattern) => (
                              <option value={pattern.value} key={pattern.value}>
                                {pattern.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Sticker-Pack
                          <select name="stickerPack" defaultValue={activeProfile.stickerPack}>
                            {stickerPackOptions.map((pack) => (
                              <option value={pack.value} key={pack.value}>
                                {pack.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="check-label">
                          <input name="glitter" type="checkbox" defaultChecked={activeProfile.glitter} />
                          Glitzer-Modus
                        </label>
                        <button className="aqua-button">Style speichern</button>
                      </form>
                    </section>
                  )}

                  <section className="wall-box">
                    <h3>Top Freunde</h3>
                    <div className="top-friends">
                      {topFriends.length ? (
                        topFriends.map((friend) => (
                          <button key={friend.id} onClick={() => setViewProfileId(friend.id)}>
                            <span className="mini-avatar">
                              {friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name[0]}
                            </span>
                            <span>{friend.name}</span>
                          </button>
                        ))
                      ) : (
                        <p>Noch keine anderen Pinnwände.</p>
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
                    <h3>Etwas anpinnen</h3>
                    <form className="pin-form" onSubmit={pinPost}>
                      <label>
                        Sticker
                        <select name="sticker" defaultValue={stickerOptions[0]}>
                          {stickerOptions.map((sticker) => (
                            <option key={sticker}>{sticker}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Nachricht
                        <textarea name="text" placeholder={`Schreib etwas auf ${viewProfile.name}s Wand`} required />
                      </label>
                      <button className="aqua-button">Auf die Wand pinnen</button>
                    </form>
                  </section>

                  <section className="wall-box">
                    <h3>Wand</h3>
                    <div className="wall-posts">
                      {wallPosts.length ? (
                        wallPosts.map((post) => {
                          const author = profiles.find((profile) => profile.id === post.authorId);
                          return (
                            <article className="wall-post" key={post.id}>
                              <strong>{post.sticker}</strong>
                              <p>{post.text}</p>
                              <span>
                                Von {author?.name || "Unbekannt"} · {new Date(post.createdAt).toLocaleString("de-DE")}
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
    </main>
  );
}
