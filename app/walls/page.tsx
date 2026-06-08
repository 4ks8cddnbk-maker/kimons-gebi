"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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

const defaultProfiles: Profile[] = [
  {
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
  }
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

export default function WallsPage() {
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfiles[0].id);
  const [viewProfileId, setViewProfileId] = useState(defaultProfiles[0].id);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginHandle, setLoginHandle] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const viewProfile = profiles.find((profile) => profile.id === viewProfileId) || profiles[0];
  const wallPosts = useMemo(
    () => posts.filter((post) => post.targetId === viewProfile.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts, viewProfile.id]
  );
  const topFriends = profiles.filter((profile) => profile.id !== viewProfile.id).slice(0, 6);

  useEffect(() => {
    loadWalls();
  }, []);

  async function loadWalls() {
    setLoading(true);

    try {
      const [profilesResponse, postsResponse] = await Promise.all([
        fetch("/api/walls/profiles", { cache: "no-store" }),
        fetch("/api/walls/posts", { cache: "no-store" })
      ]);
      const profilesData = await profilesResponse.json();
      const postsData = await postsResponse.json();
      const nextProfiles = profilesData.profiles?.length ? profilesData.profiles : defaultProfiles;

      setProfiles(nextProfiles);
      setPosts(postsData.posts || []);
      setActiveProfileId(profilesData.activeProfileId || nextProfiles[0].id);
      setViewProfileId((currentId) => nextProfiles.find((profile: Profile) => profile.id === currentId)?.id || nextProfiles[0].id);

      if (!profilesResponse.ok || !postsResponse.ok) {
        setStatus(profilesData.message || postsData.message || "Supabase ist noch nicht fertig eingerichtet.");
      }
    } catch {
      setStatus("Pinnwände konnten nicht geladen werden.");
    } finally {
      setLoading(false);
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
      body: JSON.stringify({ handle: loginHandle, password: loginPassword })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || "Login stimmt nicht.");
      return;
    }

    setActiveProfileId(data.activeProfileId);
    setViewProfileId(data.activeProfileId);
    setLoginHandle("");
    setLoginPassword("");
    setStatus("Eingeloggt.");
  }

  async function logout() {
    await fetch("/api/walls/login", { method: "DELETE" });
    setActiveProfileId(profiles[0]?.id || defaultProfiles[0].id);
    setStatus("Ausgeloggt.");
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("avatar");
    const name = String(formData.get("name") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !password) return;

    setStatus("Pinnwand wird gespeichert...");

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
      handle: String(formData.get("handle") || name.toLowerCase().replace(/\s+/g, "-")).replace(/^@/, ""),
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
      setStatus(data.message || "Pinnwand konnte nicht gespeichert werden.");
      return;
    }

    setProfiles((currentProfiles) => [...currentProfiles, data.profile]);
    setActiveProfileId(data.profile.id);
    setViewProfileId(data.profile.id);
    setStatus("Pinnwand erstellt.");
    form.reset();
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    setStatus("Bild(er) werden hochgeladen...");

    try {
      const data = await uploadFiles(files);

      if (data.profile) {
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) => (profile.id === data.profile?.id ? data.profile : profile))
        );
      }

      setStatus(data.message || "Bild(er) auf deine Pinnwand gelegt.");
      event.target.value = "";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function saveStyle(event: FormEvent<HTMLFormElement>) {
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

    setProfiles((currentProfiles) =>
      currentProfiles.map((profile) => (profile.id === data.profile.id ? data.profile : profile))
    );
    setViewProfileId(data.profile.id);
    setStatus("Style gespeichert.");
  }

  async function pinPost(event: FormEvent<HTMLFormElement>) {
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

    setPosts((currentPosts) => [data.post, ...currentPosts]);
    setStatus(`Auf ${viewProfile.name}s Pinnwand gepinnt.`);
    form.reset();
  }

  return (
    <main className="walls-page">
      <nav className="topbar" aria-label="Pinnwand Navigation">
        <div>
          <a href="/">Zur Partyseite</a>
          <a href="#create">Pinnwand erstellen</a>
          <a href="#wall">Wand ansehen</a>
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
            Erstell dir eine kleine Retro-Pinnwand, lade Bilder hoch, setz deinen Status und pinne anderen Leuten
            Nachrichten auf die Wand.
          </p>
        </div>
      </section>

      <section id="create" className="section walls-layout">
        <form className="snow-window form wall-create" onSubmit={createProfile}>
          <p className="eyebrow">Neues Profil</p>
          <h2>Pinnwand erstellen</h2>
          <label>
            Name
            <input name="name" required placeholder="Dein Name" />
          </label>
          <label>
            Nutzername
            <input name="handle" placeholder="z. B. louki2003" />
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
            Status
            <input name="mood" placeholder="z. B. bereit fuer Karaoke" />
          </label>
          <label>
            Profil-Song
            <input name="song" placeholder="Dein Song des Abends" />
          </label>
          <label>
            Überschrift
            <input name="headline" placeholder="z. B. Loukis Ecke im Internet" />
          </label>
          <label>
            Style
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
          <button className="aqua-button">Pinnwand speichern</button>
          {status && <p className="form-message done">{status}</p>}
        </form>

        <div className="snow-window wall-switcher">
          <p className="eyebrow">Account</p>
          <h2>Anmelden</h2>
          <form className="form compact wall-login" onSubmit={login}>
            <label>
              Nutzername
              <input value={loginHandle} onChange={(event) => setLoginHandle(event.target.value)} placeholder="dein Nutzername" />
            </label>
            <label>
              Passwort
              <input
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                placeholder="dein Passwort"
              />
            </label>
            <button className="aqua-button">Einloggen</button>
            <button className="secondary-button" type="button" onClick={logout}>
              Ausloggen
            </button>
          </form>
          <p className="eyebrow">Aktiv</p>
          {loading && <p>Pinnwände werden geladen...</p>}
          <div className="wall-profile-list">
            <button className="active" type="button">
              <span className="mini-avatar">{activeProfile.avatar ? <img src={activeProfile.avatar} alt="" /> : activeProfile.name[0]}</span>
              <span>{activeProfile.name}</span>
            </button>
          </div>
          <label className="photo-drop">
            Bilder auf meine Pinnwand laden
            <input type="file" accept="image/*" multiple onChange={uploadPhotos} />
          </label>
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
                        <span className="mini-avatar">{friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name[0]}</span>
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
    </main>
  );
}
