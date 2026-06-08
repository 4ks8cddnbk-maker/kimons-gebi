"use client";

import { FormEvent, useState } from "react";

export default function EnterPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Prüfe Passwort...");

    const response = await fetch("/api/site-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/";
      return;
    }

    const data = await response.json();
    setMessage(data.message || "Das Passwort stimmt nicht.");
  }

  return (
    <main className="gate-page">
      <section className="snow-window gate-card">
        <div className="window-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">Privater Zugang</p>
        <h1>Kimons 23. Geburtstag</h1>
        <p>Diese Website ist nur für Gäste. Gib kurz das Passwort ein, dann geht es weiter.</p>
        <form className="form compact" onSubmit={login}>
          <label>
            Passwort
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Passwort"
              required
            />
          </label>
          <button className="aqua-button">Website öffnen</button>
        </form>
        {message && <p className="form-message done">{message}</p>}
      </section>
    </main>
  );
}
