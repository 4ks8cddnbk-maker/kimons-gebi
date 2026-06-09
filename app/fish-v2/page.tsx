"use client";

import { FormEvent, useState } from "react";

const tracks = [
  { title: "Moment", artist: "C4RL" },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus" },
  { title: "The One That Got Away", artist: "Katy Perry" }
];

export default function FishV2Gate() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("checking...");

    const response = await fetch("/api/site-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setMessage("access denied");
      return;
    }

    window.location.href = "/walls";
  }

  return (
    <main className="fish-v2-gate">
      <button className="v2-admin-trigger" type="button" onClick={() => setMenuOpen((value) => !value)}>
        admin
      </button>

      {menuOpen && (
        <form className="v2-admin-menu" onSubmit={unlock}>
          <label>
            unlock .fish
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="password"
            />
          </label>
          <button>enter</button>
          {message && <span>{message}</span>}
        </form>
      )}

      <section className="v2-hero">
        <div className="v2-window">
          <div className="myspace-topbar">
            <span />
            <span />
            <span />
            <strong>.fish V2.0</strong>
          </div>
          <div className="v2-window-body">
            <p className="eyebrow">snow leopard preview</p>
            <h1>currently working on .fish V2</h1>
            <p>glassy profiles, cleaner feeds, brighter colors, better party internet.</p>
          </div>
        </div>
      </section>

      <section className="v2-waiting">
        <p className="eyebrow">while you wait</p>
        <h2>scroll down, press play in your head.</h2>
        <div className="v2-ipod">
          <div className="v2-ipod-screen">
            <strong>iPod von Kimon</strong>
            <div className="v2-storage">
              <span>1.0 GB Used</span>
              <span>732 GB Free</span>
            </div>
            <div className="v2-bar">
              <i />
            </div>
            <ul>
              {tracks.map((track) => (
                <li key={track.title}>
                  {track.title} <span>{track.artist}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="v2-clickwheel">
            <span>MENU</span>
            <b>▶</b>
          </div>
        </div>
      </section>
    </main>
  );
}
