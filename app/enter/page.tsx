"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("Prüfe Passwort...");

    const response = await fetch("/api/site-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setStatus("Das Passwort stimmt nicht.");
      setIsSubmitting(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") || "/";
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="gate-page">
      <section className="snow-window gate-card">
        <div className="window-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">Geschlossene Einladung</p>
        <h1>Kimons 23. Geburtstag</h1>
        <p className="hero-copy">
          Diese Seite ist nur für eingeladene Gäste. Gib das Passwort ein, um zur Einladung zu gelangen.
        </p>
        <form className="form compact" onSubmit={submitPassword}>
          <label>
            Passwort
            <input
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Passwort eingeben"
              type="password"
              required
            />
          </label>
          <button className="aqua-button" disabled={isSubmitting}>
            {isSubmitting ? "Prüfe..." : "Einladung öffnen"}
          </button>
          {status && <p className="form-message done">{status}</p>}
        </form>
      </section>
    </main>
  );
}
