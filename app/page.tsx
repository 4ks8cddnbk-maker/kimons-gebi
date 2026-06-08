"use client";

import { FormEvent, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Photo = {
  url: string;
  uploadedAt: string;
  caption?: string;
};

const tracks = [
  {
    title: "Moment",
    artist: "C4RL",
    src: "/music/c4rl-moment.mp3"
  },
  {
    title: "Party In The U.S.A.",
    artist: "Miley Cyrus",
    src: "/music/party-in-the-usa.mp3"
  },
  {
    title: "The One That Got Away",
    artist: "Katy Perry",
    src: "/music/the-one-that-got-away.mp3"
  }
];

const snakeSize = 10;
const initialSnake = [
  { x: 4, y: 5 },
  { x: 3, y: 5 },
  { x: 2, y: 5 }
];
const initialFood = { x: 7, y: 5 };
const directions = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

function getCountdown() {
  const party = new Date("2026-06-27T19:00:00+02:00").getTime();
  const diff = Math.max(0, party - Date.now());

  return {
    tage: Math.floor(diff / 86_400_000),
    stunden: Math.floor((diff / 3_600_000) % 24),
    minuten: Math.floor((diff / 60_000) % 60),
    sekunden: Math.floor((diff / 1000) % 60)
  };
}

const foodItems = [
  "Hauptspeise wird noch festgelegt",
  "Vegetarische Option",
  "Frischer Salat",
  "Brot, Dips und kleine Beilagen",
  "Dessert oder Geburtstagskuchen"
];

const drinkItems = [
  "Wasser und Softdrinks",
  "Mate oder Eistee",
  "Bier",
  "Wein oder Sekt",
  "Ein Aperitif wird noch festgelegt"
];

const dresscodeCards = [
  {
    range: "1-2",
    icon: "👕",
    verdict: "Nein",
    tone: "low",
    title: "Sehr casual",
    text: "Jogginghose, Sportshirt oder ein sehr informeller Freizeit-Look."
  },
  {
    range: "3-5",
    icon: "🧢",
    verdict: "Eher nicht",
    tone: "low",
    title: "Alltags-Casual",
    text: "Sehr einfache Alltagskleidung ist für den Abend etwas zu wenig."
  },
  {
    range: "6-7",
    icon: "👔",
    verdict: "Top",
    tone: "good",
    title: "Smart Casual",
    text: "Hemd oder Bluse, Chino, Kleid, schönes Top, gepflegte Sneaker oder Loafer."
  },
  {
    range: "8-9",
    icon: "🥂",
    verdict: "Top",
    tone: "good",
    title: "Festlich",
    text: "Sakko, Kleid, Absatzschuhe, Stoffhose oder ein Look mit etwas mehr Stil."
  },
  {
    range: "10",
    icon: "✨",
    verdict: "Gerne",
    tone: "good",
    title: "Full Glam",
    text: "Sehr schick ist willkommen, aber kein Muss. Wer Lust hat, darf glänzen."
  }
];

export default function Home() {
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [beatPulse, setBeatPulse] = useState(0);
  const [ipodTilt, setIpodTilt] = useState({ x: 0, y: 0 });
  const [ipodMode, setIpodMode] = useState<"music" | "snake">("music");
  const [snake, setSnake] = useState(initialSnake);
  const [snakeFood, setSnakeFood] = useState(initialFood);
  const [snakeDirection, setSnakeDirection] = useState<keyof typeof directions>("right");
  const [snakeRunning, setSnakeRunning] = useState(false);
  const [snakeGameOver, setSnakeGameOver] = useState(false);
  const [snakeScore, setSnakeScore] = useState(0);
  const [windowOffset, setWindowOffset] = useState({ x: 0, y: 0 });
  const [countdown, setCountdown] = useState(getCountdown);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [routeDestination, setRouteDestination] = useState("");
  const [routeTime, setRouteTime] = useState("01:00");
  const [karaokeState, setKaraokeState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/photos")
      .then((response) => response.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => setPhotos([]));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    setTrackProgress(0);

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [activeTrack]);

  useEffect(() => {
    if (ipodMode !== "snake" || !snakeRunning || snakeGameOver) return;

    const interval = window.setInterval(() => {
      setSnake((currentSnake) => {
        const move = directions[snakeDirection];
        const head = currentSnake[0];
        const nextHead = {
          x: (head.x + move.x + snakeSize) % snakeSize,
          y: (head.y + move.y + snakeSize) % snakeSize
        };
        const hitSelf = currentSnake.some((part) => part.x === nextHead.x && part.y === nextHead.y);

        if (hitSelf) {
          setSnakeRunning(false);
          setSnakeGameOver(true);
          return currentSnake;
        }

        const ateFood = nextHead.x === snakeFood.x && nextHead.y === snakeFood.y;
        const nextSnake = [nextHead, ...currentSnake];

        if (ateFood) {
          setSnakeScore((score) => score + 1);
          setSnakeFood(createFood(nextSnake));
          return nextSnake;
        }

        nextSnake.pop();
        return nextSnake;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [ipodMode, snakeDirection, snakeFood, snakeRunning, snakeGameOver]);

  function previousTrack() {
    setActiveTrack((activeTrack + tracks.length - 1) % tracks.length);
  }

  function nextTrack() {
    setActiveTrack((activeTrack + 1) % tracks.length);
  }

  function togglePlayback() {
    if (ipodMode === "snake") {
      toggleSnake();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setTrackProgress((audio.currentTime / audio.duration) * 100);
    setBeatPulse(0.66 + Math.abs(Math.sin(audio.currentTime * 5.8)) * 0.34);
  }

  function tiltIpod(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientY - rect.top) / rect.height - 0.5) * -14;
    const y = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
    setIpodTilt({ x, y });
  }

  function createFood(currentSnake: { x: number; y: number }[]) {
    const openCells = [];

    for (let y = 0; y < snakeSize; y += 1) {
      for (let x = 0; x < snakeSize; x += 1) {
        if (!currentSnake.some((part) => part.x === x && part.y === y)) {
          openCells.push({ x, y });
        }
      }
    }

    return openCells[Math.floor(Math.random() * openCells.length)] || initialFood;
  }

  function resetSnake() {
    setSnake(initialSnake);
    setSnakeFood(initialFood);
    setSnakeDirection("right");
    setSnakeRunning(false);
    setSnakeGameOver(false);
    setSnakeScore(0);
  }

  function toggleSnake() {
    if (snakeGameOver) {
      resetSnake();
      setSnakeRunning(true);
      return;
    }

    setSnakeRunning((running) => !running);
  }

  function setSnakeMove(direction: keyof typeof directions) {
    const opposite: Record<keyof typeof directions, keyof typeof directions> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left"
    };

    if (opposite[direction] !== snakeDirection) {
      setSnakeDirection(direction);
    }
  }

  function handleNext() {
    if (ipodMode === "snake") {
      setSnakeMove("right");
      return;
    }

    nextTrack();
  }

  function handlePrevious() {
    if (ipodMode === "snake") {
      setSnakeMove("left");
      return;
    }

    previousTrack();
  }

  function handleTopButton() {
    if (ipodMode === "snake") {
      setSnakeMove("up");
      return;
    }

    setIpodMode("snake");
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  function handleBottomButton() {
    if (ipodMode === "snake") {
      setSnakeMove("down");
      return;
    }

    togglePlayback();
  }

  function startWindowDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: windowOffset.x,
      originY: windowOffset.y
    };
  }

  function moveWindow(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;

    setWindowOffset({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY
    });
  }

  function stopWindowDrag() {
    dragRef.current = null;
  }

  async function submitKaraoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKaraokeState("sending");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/karaoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    setKaraokeState(response.ok ? "done" : "error");
    setMessage(data.message || (response.ok ? "Danke, dein Karaoke-Song ist eingetragen." : "Das hat leider nicht geklappt."));

    if (response.ok) event.currentTarget.reset();
  }

  const encodedStart = encodeURIComponent("Wendelinstraße 94, Aachen");
  const encodedDestination = encodeURIComponent(routeDestination.trim());
  const routeTimeParts = routeTime.split(":").map(Number);
  const routeHour = Number.isFinite(routeTimeParts[0]) ? routeTimeParts[0] : 1;
  const routeMinute = Number.isFinite(routeTimeParts[1]) ? routeTimeParts[1] : 0;
  const routeDate = new Date(2026, 5, routeHour >= 19 ? 27 : 28, routeHour, routeMinute);
  const departureTime = Math.floor(routeDate.getTime() / 1000);
  const mapsRouteUrl = routeDestination.trim()
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodedStart}&destination=${encodedDestination}&travelmode=transit&departure_time=${departureTime}`
    : "";

  return (
    <main>
      <nav className="topbar" aria-label="Hauptnavigation">
        <div>
          <a href="#home">Start</a>
          <a href="#ipod">iPod</a>
          <a href="#karaoke">Karaoke</a>
          <a href="/walls">.fish</a>
          <a href="#dresscode">Dresscode</a>
          <a href="#galerie">Fotos</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

      <section id="home" className="hero">
        <div className="snow-window hero-window">
          <div className="window-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="eyebrow">Kimon wird 23</p>
          <h1>Kimons 23. Geburtstag</h1>
          <p className="hero-copy">
            Samstag, 27.06.2026 um 19:00 Uhr · Wendelinstraße 94. Dresscode: eher schick, aber nicht
            übertrieben formell. Smart casual bis festlich ist genau richtig.
          </p>
          <div className="hero-actions">
            <a href="#karaoke" className="aqua-button">
              Karaoke eintragen
            </a>
            <a href="/walls" className="secondary-button">
              .fish öffnen
            </a>
          </div>
        </div>

        <div className="desktop-stack" aria-label="Party Eckdaten">
          <div
            className="apple-card draggable-window"
            style={{ transform: `translate3d(${windowOffset.x}px, ${windowOffset.y}px, 0)` }}
          >
            <div
              className="aqua-titlebar"
              onPointerDown={startWindowDrag}
              onPointerMove={moveWindow}
              onPointerUp={stopWindowDrag}
              onPointerCancel={stopWindowDrag}
            >
              <span />
              <span />
              <span />
              <strong>Wann und wo</strong>
            </div>
            <h2>23. Geburtstag</h2>
            <p>27. Juni 2026 · 19:00 · Wendelinstraße 94</p>
            <div className="detail-list">
              <span>Ort</span>
              <strong>Wendelinstraße 94</strong>
              <span>Karte</span>
              <strong>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Wendelinstra%C3%9Fe%2094%2C%20Aachen"
                  target="_blank"
                  rel="noreferrer"
                >
                  Auf Google Maps öffnen
                </a>
              </strong>
              <span>Look</span>
              <strong>Schick, entspannt, bewusst</strong>
            </div>
            <div className="mini-map">
              <iframe
                title="Karte: Wendelinstraße 94"
                src="https://www.google.com/maps?q=Wendelinstra%C3%9Fe%2094%2C%20Aachen&output=embed"
                loading="lazy"
              />
            </div>
          </div>
          <div className="countdown">
            {Object.entries(countdown).map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="ipod"
        className={`section ipod-section ${isPlaying ? "party-mode" : ""}`}
        style={{ "--beat": beatPulse } as CSSProperties}
      >
        <audio
          ref={audioRef}
          src={tracks[activeTrack].src}
          onTimeUpdate={updateProgress}
          onEnded={nextTrack}
          onPause={() => {
            setIsPlaying(false);
            setBeatPulse(0);
          }}
          onPlay={() => {
            setIsPlaying(true);
            setBeatPulse(0.85);
          }}
        />
        <div
          className="ipod"
          aria-label="Interaktiver iPod Classic mit Musik und Snake"
          onMouseMove={tiltIpod}
          onMouseLeave={() => setIpodTilt({ x: 0, y: 0 })}
          style={{
            transform: `rotateX(${ipodTilt.x}deg) rotateY(${ipodTilt.y}deg)`
          }}
        >
          <div className="ipod-screen">
            <div className="ipod-tabs">
              <button className={ipodMode === "music" ? "active" : ""} onClick={() => setIpodMode("music")}>
                Musik
              </button>
              <button className={ipodMode === "snake" ? "active" : ""} onClick={() => setIpodMode("snake")}>
                Snake
              </button>
            </div>
            {ipodMode === "music" ? (
              <>
                <small>Playlist</small>
                <ol className="ipod-list">
                  {tracks.map((track, index) => (
                    <li className={index === activeTrack ? "active" : ""} key={track.title}>
                      <button onClick={() => setActiveTrack(index)}>
                        <span>{track.title}</span>
                        <small>{track.artist}</small>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="progress">
                  <i style={{ width: `${trackProgress}%` }} />
                </div>
                <p className="ipod-status">
                  {isPlaying ? "Spielt" : "Pause"} · {tracks[activeTrack].title}
                </p>
              </>
            ) : (
              <div className="snake-game">
                <div className="snake-headline">
                  <strong>Snake</strong>
                  <span>{snakeGameOver ? "Game over" : snakeRunning ? "Läuft" : "Bereit"} · {snakeScore}</span>
                </div>
                <div className="snake-board" aria-label="Snake Spielfeld">
                  {Array.from({ length: snakeSize * snakeSize }, (_, index) => {
                    const x = index % snakeSize;
                    const y = Math.floor(index / snakeSize);
                    const isSnake = snake.some((part) => part.x === x && part.y === y);
                    const isHead = snake[0].x === x && snake[0].y === y;
                    const isFood = snakeFood.x === x && snakeFood.y === y;

                    return (
                      <span
                        className={`${isSnake ? "snake-cell" : ""} ${isHead ? "head" : ""} ${isFood ? "food" : ""}`}
                        key={`${x}-${y}`}
                      />
                    );
                  })}
                </div>
                <p className="ipod-status">MENU hoch · PLAY runter · ◀ ▶ lenken · Mitte Start</p>
              </div>
            )}
          </div>
          <div className="wheel">
            <button onClick={handleTopButton}>MENU</button>
            <button onClick={handleNext}>▶▶</button>
            <button onClick={handlePrevious}>◀◀</button>
            <button className="play-label" onClick={handleBottomButton}>
              {ipodMode === "snake" ? "DOWN" : isPlaying ? "PAUSE" : "PLAY"}
            </button>
            <button className="center" onClick={togglePlayback}>
              {ipodMode === "snake" ? (snakeRunning ? "Ⅱ" : "▶") : isPlaying ? "Ⅱ" : "▶"}
            </button>
          </div>
        </div>
      </section>

      <section id="karaoke" className="section split">
        <div>
          <p className="eyebrow">Karaoke</p>
          <h2>Dein Song für den Abend</h2>
          <p>
            Jede Person kann einen Song machen. Trag bitte ein, welchen Song du singen willst und mit wem du ihn
            machst, damit am Abend alles entspannt geplant werden kann.
          </p>
        </div>
        <form className="snow-window form" onSubmit={submitKaraoke}>
          <label>
            Name
            <input name="name" required placeholder="Dein Name" />
          </label>
          <label>
            Song
            <input name="song" required placeholder="Titel und Interpret" />
          </label>
          <label>
            Mit wem machst du den Song?
            <input name="partners" required placeholder="Alle Namen eintragen" />
          </label>
          <label>
            Hinweis
            <textarea name="notes" placeholder="Optional: Version, YouTube-Link, besondere Wünsche..." />
          </label>
          <button className="aqua-button" disabled={karaokeState === "sending"}>
            {karaokeState === "sending" ? "Sende..." : "Karaoke anmelden"}
          </button>
          {message && <p className={`form-message ${karaokeState}`}>{message}</p>}
        </form>
      </section>

      <section id="dresscode" className="section">
        <div className="dresscode-panel">
          <p className="eyebrow">Dresscode</p>
          <h2>Was anziehen?</h2>
          <p className="dresscode-intro">
            Kommt schick, aber entspannt. Stufe 6-10 ist der ideale Bereich: gepflegt, stilvoll und trotzdem
            nicht zu formell.
          </p>
          <div className="dresscode-labels" aria-hidden="true">
            <span>Casual</span>
            <span>Smart Casual</span>
            <span>Festlich</span>
          </div>
          <div className="dresscode-scale" aria-label="Dresscode Skala von 1 bis 10">
            {Array.from({ length: 10 }, (_, index) => {
              const level = index + 1;
              return (
                <span className={level >= 6 ? "wanted" : ""} key={level}>
                  {level}
                </span>
              );
            })}
          </div>
          <div className="dresscode-examples">
            {dresscodeCards.map((item) => (
              <article className={`dresscode-example ${item.tone}`} key={item.range}>
                <span className="dresscode-badge">{item.verdict}</span>
                <span className="dresscode-example-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <strong>{item.range}</strong>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="galerie" className="section">
        {photos.length ? (
          <>
            <div className="section-head">
              <div>
                <p className="eyebrow">Fotos</p>
                <h2>Bilder vom Abend</h2>
              </div>
            </div>
            <div className="gallery">
              {photos.map((photo) => (
                <figure key={photo.url}>
                  <img src={photo.url} alt={photo.caption || "Partyfoto"} />
                  <figcaption>{photo.caption || "Kimons Geburtstag"}</figcaption>
                </figure>
              ))}
            </div>
          </>
        ) : (
          <div className="snow-window photos-note">
            <p className="eyebrow">Fotos</p>
            <h2>Hier werden die Bilder im Anschluss hochgeladen.</h2>
          </div>
        )}
      </section>

      <section id="food" className="section split">
        <div>
          <p className="eyebrow">Speiseplan</p>
          <h2>Speisen & Getränke</h2>
          <p>Die genaue Auswahl steht noch nicht fest. Bis dahin dient diese Liste als Platzhalter.</p>
        </div>
        <div className="menu-lists">
          <div>
            <h3>Speisen</h3>
            <ul>
              {foodItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Getränke</h3>
            <ul>
              {drinkItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="bus" className="section">
        <div className="bus-panel">
          <p className="eyebrow">ASEAG Nachtbus</p>
          <h2>Heimweg planen</h2>
          <p>
            Trag ein, wohin du musst und wann du ungefähr los willst. Google Maps öffnet dir direkt eine Route mit
            Bus und Bahn ab der Wendelinstraße 94.
          </p>
          <div className="bus-grid">
            <div>
              <strong>Start</strong>
              <span>Wendelinstraße 94</span>
            </div>
            <div>
              <strong>Haltestelle</strong>
              <span>Brand Steinbrück</span>
            </div>
            <div>
              <strong>Modus</strong>
              <span>Nachtbus / Taxi-Backup</span>
            </div>
          </div>
          <form className="route-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Zieladresse
              <input
                value={routeDestination}
                onChange={(event) => setRouteDestination(event.target.value)}
                placeholder="z. B. Aachen Hbf oder deine Adresse"
              />
            </label>
            <label>
              Losgehen gegen
              <input
                type="time"
                value={routeTime}
                onChange={(event) => setRouteTime(event.target.value)}
                aria-label="Uhrzeit fuer den Heimweg"
              />
            </label>
          </form>
          <div className="route-actions">
            <a
              className={`aqua-button route-link ${mapsRouteUrl ? "" : "disabled"}`}
              href={mapsRouteUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!mapsRouteUrl}
            >
              Route in Google Maps
            </a>
            <a className="secondary-button route-link" href="https://www.aseag.de/fahrplan/auskunft" target="_blank" rel="noreferrer">
              ASEAG Fahrplan
            </a>
          </div>
          <p className="route-hint">
            Tipp: Als Start ist die Party-Adresse gesetzt. Deine geplante Uhrzeit ist {routeTime} Uhr.
          </p>
        </div>
      </section>

      <footer>
        <strong>Kimons 23. Geburtstag</strong>
        <span>27.06.2026 · 19:00 · Wendelinstraße 94</span>
      </footer>
    </main>
  );
}
