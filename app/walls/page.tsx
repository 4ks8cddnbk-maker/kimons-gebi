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
    photos: []
  }
];

const stickerOptions = ["Aqua Star", "Mixtape", "Karaoke", "Party Pin", "Snow Leopard"];
const themeOptions = [
  { value: "blue", label: "Aqua Blau" },
  { value: "green", label: "Limewire Gruen" },
  { value: "pink", label: "MySpace Pink" },
  { value: "gold", label: "iPod Gold" }
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WallsPage() {
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfiles[0].id);
  const [viewProfileId, setViewProfileId] = useState(defaultProfiles[0].id);
  const [status, setStatus] = useState("");

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const viewProfile = profiles.find((profile) => profile.id === viewProfileId) || profiles[0];
  const wallPosts = useMemo(
    () => posts.filter((post) => post.targetId === viewProfile.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts, viewProfile.id]
  );
  const topFriends = profiles.filter((profile) => profile.id !== viewProfile.id).slice(0, 6);

  useEffect(() => {
    const savedProfiles = window.localStorage.getItem("kimon-wall-profiles");
    const savedPosts = window.localStorage.getItem("kimon-wall-posts");

    if (savedProfiles) {
      const parsedProfiles = JSON.parse(savedProfiles) as Profile[];
      setProfiles(parsedProfiles.length ? parsedProfiles : defaultProfiles);
      setActiveProfileId(parsedProfiles[0]?.id || defaultProfiles[0].id);
      setViewProfileId(parsedProfiles[0]?.id || defaultProfiles[0].id);
    }

    if (savedPosts) {
      setPosts(JSON.parse(savedPosts) as WallPost[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kimon-wall-profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    window.localStorage.setItem("kimon-wall-posts", JSON.stringify(posts));
  }, [posts]);

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("avatar");
    const avatar = file instanceof File && file.size ? await readImage(file) : "";
    const name = String(formData.get("name") || "").trim();

    if (!name) return;

    const profile: Profile = {
      id: createId(),
      name,
      handle: String(formData.get("handle") || name.toLowerCase().replace(/\s+/g, "-")).replace(/^@/, ""),
      avatar,
      bio: String(formData.get("bio") || "Noch keine Bio, aber bestimmt eine starke Pinnwand."),
      mood: String(formData.get("mood") || "online"),
      song: String(formData.get("song") || "Karaoke Song offen"),
      theme: String(formData.get("theme") || "blue"),
      photos: []
    };

    setProfiles((currentProfiles) => [...currentProfiles, profile]);
    setActiveProfileId(profile.id);
    setViewProfileId(profile.id);
    setStatus("Pinnwand erstellt.");
    form.reset();
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    const images = await Promise.all(files.map(readImage));
    setProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === activeProfile.id ? { ...profile, photos: [...images, ...profile.photos].slice(0, 12) } : profile
      )
    );
    setStatus("Bild(er) auf deine Pinnwand gelegt.");
    event.target.value = "";
  }

  function pinPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) return;

    setPosts((currentPosts) => [
      {
        id: createId(),
        authorId: activeProfile.id,
        targetId: viewProfile.id,
        text,
        sticker: String(formData.get("sticker") || stickerOptions[0]),
        createdAt: new Date().toISOString()
      },
      ...currentPosts
    ]);
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
            Kurzer Text
            <textarea name="bio" placeholder="Was soll auf deiner Pinnwand stehen?" />
          </label>
          <button className="aqua-button">Pinnwand speichern</button>
          {status && <p className="form-message done">{status}</p>}
        </form>

        <div className="snow-window wall-switcher">
          <p className="eyebrow">Wer bist du?</p>
          <h2>Profil wählen</h2>
          <div className="wall-profile-list">
            {profiles.map((profile) => (
              <button
                className={profile.id === activeProfile.id ? "active" : ""}
                key={profile.id}
                onClick={() => setActiveProfileId(profile.id)}
              >
                <span className="mini-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name[0]}</span>
                <span>{profile.name}</span>
              </button>
            ))}
          </div>
          <label className="photo-drop">
            Bilder auf meine Pinnwand laden
            <input type="file" accept="image/*" multiple onChange={uploadPhotos} />
          </label>
        </div>
      </section>

      <section id="wall" className={`section wall-stage theme-${viewProfile.theme}`}>
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
            <strong>{viewProfile.name}s Pinnwand</strong>
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
            </div>

            <div className="profile-main">
              <section className="wall-box">
                <h3>Über mich</h3>
                <p>{viewProfile.bio}</p>
              </section>

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
