"use client";

import { FormEvent, useEffect, useState } from "react";

type Photo = {
  url: string;
  caption?: string;
  uploadedAt: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadPhotos() {
    const response = await fetch("/api/photos");
    const data = await response.json();
    setPhotos(data.photos || []);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Prüfe Passwort...");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      setLoggedIn(true);
      setStatus("Admin-Modus aktiv.");
      setPassword("");
      return;
    }

    setStatus("Das Passwort stimmt nicht.");
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setUploading(true);
    setStatus("Upload läuft...");

    const response = await fetch("/api/photos", {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    setUploading(false);
    setStatus(data.message || (response.ok ? "Foto(s) hochgeladen." : "Upload fehlgeschlagen."));

    if (response.ok) {
      form.reset();
      loadPhotos();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setStatus("Abgemeldet.");
  }

  return (
    <main className="admin-page">
      <nav className="topbar">
        <div>
          <a href="/">Zur Website</a>
        </div>
      </nav>

      <section className="section admin-layout">
        <div className="snow-window admin-card">
          <div className="window-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="eyebrow">Admin Login</p>
          <h1>Foto-Upload</h1>
          <p>
            Login mit Passwort. Danach kannst du mehrere Fotos auswählen und sie erscheinen automatisch in der
            Galerie.
          </p>

          {!loggedIn ? (
            <form className="form compact" onSubmit={login}>
              <label>
                Admin Passwort
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Passwort"
                  required
                />
              </label>
              <button className="aqua-button">Einloggen</button>
            </form>
          ) : (
            <form className="form compact" onSubmit={upload}>
              <label>
                Fotos auswählen
                <input name="files" type="file" accept="image/*" multiple required />
              </label>
              <button className="aqua-button" disabled={uploading}>
                {uploading ? "Lädt hoch..." : "Fotos hochladen"}
              </button>
              <button className="secondary-button" type="button" onClick={logout}>
                Abmelden
              </button>
            </form>
          )}
          {status && <p className="form-message done">{status}</p>}
        </div>

        <div>
          <p className="eyebrow">Galerie Vorschau</p>
          <h2>Aktuelle Bilder</h2>
          {photos.length ? (
            <div className="gallery admin-gallery">
              {photos.map((photo) => (
                <figure key={photo.url}>
                  <img src={photo.url} alt={photo.caption || "Partyfoto"} />
                  <figcaption>{photo.caption || "Kimons Geburtstag"}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p>Noch keine Fotos hochgeladen.</p>
          )}
        </div>
      </section>
    </main>
  );
}
