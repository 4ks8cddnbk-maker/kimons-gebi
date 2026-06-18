"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  fishRadioSongs as tracks,
  getFishRadioSlot,
  seekSyncedRadioAudio,
  type FishRadioSlot
} from "@/lib/fishRadio";

type PhoneApp = "home" | "photos" | "fish" | "maps" | "player";
type GalleryPhoto = { url: string; caption?: string; uploadedAt?: string };

const pinCode = "2406";
const appIcons: Array<{ id: PhoneApp; label: string; className: string; icon: string }> = [
  { id: "photos", label: "Fotos", className: "photos", icon: "✿" },
  { id: "fish", label: ".fish", className: "fish", icon: "" },
  { id: "maps", label: "Maps", className: "maps", icon: "⌖" },
  { id: "player", label: "Player", className: "player", icon: "♪" }
];

const keypad = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["0", ""]
];

export default function FishV2Gate() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeApp, setActiveApp] = useState<PhoneApp>("home");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [beatPulse, setBeatPulse] = useState(0);
  const [ipodTilt, setIpodTilt] = useState({ x: 0, y: 0 });
  const [radioStarted, setRadioStarted] = useState(false);
  const [radioSlot, setRadioSlot] = useState<FishRadioSlot>(() => getFishRadioSlot());
  const [radioNow, setRadioNow] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingRadioStartRef = useRef<FishRadioSlot | null>(null);

  const displaySlot = radioStarted ? getFishRadioSlot(radioNow) : radioSlot;

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/photos")
      .then((response) => response.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => setPhotos([]));
  }, [unlocked]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setTrackProgress(0);
    if (pendingRadioStartRef.current || radioStarted) {
      const nextSlot = pendingRadioStartRef.current || radioSlot;
      pendingRadioStartRef.current = null;
      playSelectedTrack(nextSlot);
    }
  }, [activeTrack]);

  useEffect(() => {
    if (!radioStarted) return;

    const interval = window.setInterval(() => {
      const slot = getFishRadioSlot();
      setRadioNow(Date.now());
      setRadioSlot((current) => {
        if (current.src === slot.src) return current;
        pendingRadioStartRef.current = slot;
        const nextTrackIndex = Math.max(0, tracks.findIndex((track) => track.src === slot.src));
        if (nextTrackIndex === activeTrack) {
          window.setTimeout(() => playSelectedTrack(slot), 0);
        } else {
          setActiveTrack(nextTrackIndex);
        }
        return slot;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTrack, radioStarted]);

  async function submitPin(nextPin: string) {
    if (nextPin !== pinCode) {
      setPinError(true);
      window.setTimeout(() => {
        setPin("");
        setPinError(false);
      }, 520);
      return;
    }

    await fetch("/api/site-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pinCode })
    });
    setUnlocked(true);
    setActiveApp("home");
  }

  function pressDigit(digit: string) {
    if (pin.length >= 4 || pinError) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === 4) submitPin(nextPin);
  }

  function playSelectedTrack(slot = getFishRadioSlot()) {
    const audio = audioRef.current;
    if (!audio) return;

    const startAudio = () => {
      seekSyncedRadioAudio(audio, slot);
      audio
        .play()
        .then(() => {
          setIsPlaying(!audio.muted);
          setRadioStarted(true);
          setBeatPulse(0.82);
        })
        .catch(() => setIsPlaying(false));
    };

    if (audio.getAttribute("src") !== slot.src) {
      audio.src = slot.src;
      audio.load();
    }

    if (audio.readyState >= 1) {
      startAudio();
      return;
    }

    audio.addEventListener("loadedmetadata", startAudio, { once: true });
    audio.load();
  }

  function startRadio() {
    const slot = getFishRadioSlot();
    const trackIndex = tracks.findIndex((track) => track.src === slot.src);
    setRadioSlot(slot);
    pendingRadioStartRef.current = slot;

    if (trackIndex === activeTrack) {
      pendingRadioStartRef.current = null;
      playSelectedTrack(slot);
      return;
    }

    setActiveTrack(Math.max(0, trackIndex));
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      startRadio();
      return;
    }

    audio.muted = !audio.muted;
    setIsPlaying(!audio.muted);
    setBeatPulse(audio.muted ? 0 : 0.82);
  }

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const slot = getFishRadioSlot();
    if (slot.src !== radioSlot.src) {
      const trackIndex = tracks.findIndex((track) => track.src === slot.src);
      setRadioSlot(slot);
      if (trackIndex !== activeTrack) {
        pendingRadioStartRef.current = slot;
        setActiveTrack(Math.max(0, trackIndex));
      }
    }
    setTrackProgress(slot.progress);
    if (!audio.paused) {
      setBeatPulse(0.58 + Math.abs(Math.sin(audio.currentTime * 5.8)) * 0.4);
    }
  }

  function nextTrack() {
    startRadio();
  }

  function tiltIpod(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    const y = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    setIpodTilt({ x, y });
  }

  function goHome() {
    if (!unlocked) {
      setPin("");
      return;
    }
    setActiveApp("home");
  }

  return (
    <main className="fish-phone-page">
      <audio
        ref={audioRef}
        src={radioSlot.src}
        onTimeUpdate={updateProgress}
        onEnded={nextTrack}
        onPlay={() => {
          setIsPlaying(!audioRef.current?.muted);
          setRadioStarted(true);
          setBeatPulse(0.82);
        }}
        onPause={() => {
          setIsPlaying(false);
          setBeatPulse(0);
        }}
      />

      <div className="iphone-stage">
        <div className="iphone-device">
          <div className="iphone-speaker" />
          <div className={`iphone-screen ${!unlocked ? "locked" : ""}`}>
            {!unlocked ? (
              <LockScreen pin={pin} pinError={pinError} onPress={pressDigit} onReset={() => setPin("")} />
            ) : (
              <>
                <PhoneStatusBar />
                {activeApp === "home" && <HomeScreen onOpen={setActiveApp} />}
                {activeApp !== "home" && (
                  <AppScreen
                    app={activeApp}
                    photos={photos}
                    isPlaying={isPlaying}
                    beatPulse={beatPulse}
                    displaySlot={displaySlot}
                    radioStarted={radioStarted}
                    trackProgress={trackProgress}
                    ipodTilt={ipodTilt}
                    onTilt={tiltIpod}
                    onResetTilt={() => setIpodTilt({ x: 0, y: 0 })}
                    onTogglePlayback={togglePlayback}
                  />
                )}
              </>
            )}
          </div>
          <button className="iphone-home-button" type="button" aria-label="Home" onClick={goHome}>
            <span />
          </button>
        </div>
      </div>
    </main>
  );
}

function LockScreen({
  pin,
  pinError,
  onPress,
  onReset
}: {
  pin: string;
  pinError: boolean;
  onPress: (digit: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="ios-lockscreen">
      <div className="ios-lock-status">
        <span>●●●○○</span>
        <strong>KIMON</strong>
        <span>51%</span>
      </div>
      <div className={`passcode-panel ${pinError ? "shake" : ""}`}>
        <h1>Enter Passcode</h1>
        <div className="passcode-dots" aria-label={`${pin.length} von 4 Ziffern eingegeben`}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className={index < pin.length ? "filled" : ""} />
          ))}
        </div>
        <div className="passcode-grid">
          {keypad.map(([digit, letters]) => (
            <button key={digit} type="button" onClick={() => onPress(digit)}>
              <strong>{digit}</strong>
              <small>{letters}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="lock-actions">
        <button type="button">Emergency</button>
        <button type="button" onClick={onReset}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function PhoneStatusBar() {
  return (
    <div className="ios-statusbar">
      <span>●●●○○ .fish</span>
      <strong>19:00</strong>
      <span>87%</span>
    </div>
  );
}

function HomeScreen({ onOpen }: { onOpen: (app: PhoneApp) => void }) {
  return (
    <div className="ios-homescreen">
      <div className="ios-wallpaper" />
      <section className="ios-weather-widget" aria-label="Kimons Geburtstag">
        <div>
          <small>Aachen</small>
          <strong>27°</strong>
          <span>Birthday weather</span>
        </div>
        <i />
        <ul>
          <li>19:00</li>
          <li>Wendelinstraße 94</li>
        </ul>
      </section>
      <div className="ios-app-grid">
        {appIcons.map((app) => (
          <button key={app.id} type="button" className="ios-app" onClick={() => onOpen(app.id)}>
            <span className={`ios-app-icon ${app.className}`}>
              {app.id === "fish" ? <img src="/fish-app-icon.png" alt="" /> : app.icon}
            </span>
            <strong>{app.label}</strong>
          </button>
        ))}
      </div>
      <div className="ios-dock">
        <button type="button" className="ios-app mini" onClick={() => onOpen("fish")}>
          <span className="ios-app-icon fish">
            <img src="/fish-app-icon.png" alt="" />
          </span>
        </button>
        <button type="button" className="ios-app mini" onClick={() => onOpen("maps")}>
          <span className="ios-app-icon maps">⌖</span>
        </button>
        <button type="button" className="ios-app mini" onClick={() => onOpen("player")}>
          <span className="ios-app-icon player">♪</span>
        </button>
      </div>
    </div>
  );
}

function AppScreen({
  app,
  photos,
  isPlaying,
  beatPulse,
  displaySlot,
  radioStarted,
  trackProgress,
  ipodTilt,
  onTilt,
  onResetTilt,
  onTogglePlayback
}: {
  app: PhoneApp;
  photos: GalleryPhoto[];
  isPlaying: boolean;
  beatPulse: number;
  displaySlot: FishRadioSlot;
  radioStarted: boolean;
  trackProgress: number;
  ipodTilt: { x: number; y: number };
  onTilt: (event: MouseEvent<HTMLDivElement>) => void;
  onResetTilt: () => void;
  onTogglePlayback: () => void;
}) {
  const title = app === "photos" ? "Fotos" : app === "fish" ? ".fish" : app === "maps" ? "Maps" : ".fish Player";

  return (
    <div className={`ios-app-screen app-${app}`}>
      <header className="ios-app-header">
        <strong>{title}</strong>
      </header>
      {app === "photos" && (
        <div className="ios-photos-app">
          {photos.length ? (
            photos.map((photo) => <img key={photo.url} src={photo.url} alt={photo.caption || "Partyfoto"} />)
          ) : (
            <div className="empty-photo-roll">
              <span>☼</span>
              <h2>Hier werden die Bilder im Anschluss hochgeladen.</h2>
            </div>
          )}
        </div>
      )}
      {app === "fish" && (
        <div className="ios-fish-app">
          <iframe title=".fish" src="/walls" />
        </div>
      )}
      {app === "maps" && (
        <div className="ios-maps-app">
          <iframe
            title="Wendelinstraße 94 in Aachen auf Google Maps"
            src="https://www.google.com/maps?q=Wendelinstra%C3%9Fe%2094%20Aachen&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="map-pin-card">
            <small>Party-Ziel</small>
            <strong>Wendelinstraße 94, Aachen</strong>
            <span>Tippe und ziehe die Karte zum Erkunden.</span>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Wendelinstra%C3%9Fe%2094%20Aachen"
              target="_blank"
              rel="noreferrer"
            >
              In Google Maps öffnen
            </a>
          </div>
        </div>
      )}
      {app === "player" && (
        <div className="ios-player-app" style={{ "--beat": beatPulse } as CSSProperties}>
          <div
            className={`ipod phone-ipod ${isPlaying ? "party-mode" : ""}`}
            onMouseMove={onTilt}
            onMouseLeave={onResetTilt}
            style={{ transform: `rotateX(${ipodTilt.x}deg) rotateY(${ipodTilt.y}deg)` }}
          >
            <div className="ipod-screen">
              <div className="ipod-tabs">
                <button className="active">{radioStarted ? "Radio" : "Start Radio"}</button>
              </div>
              <small>{radioStarted ? "103.7 .fish FM" : "103.7 .fish FM bereit"}</small>
              <div>
                <div className={`radio-start-screen ${radioStarted ? "on-air" : ""}`}>
                  <div className="radio-frequency">
                    <span>103.7</span>
                    <small>.fish FM</small>
                  </div>
                  <div className="radio-dancers" aria-hidden="true">
                    <i />
                    <b />
                  </div>
                  <strong>{radioStarted ? "ON AIR" : "START RADIO"}</strong>
                  <span>{radioStarted ? (displaySlot.kind === "host" ? "Moderation" : displaySlot.artist) : "shuffle broadcast"}</span>
                  <small>{radioStarted ? (displaySlot.kind === "host" ? ".fish FM spricht" : displaySlot.title) : "press play"}</small>
                </div>
                <div className="progress">
                  <i style={{ width: `${trackProgress}%` }} />
                </div>
                <p className="ipod-status">
                  {radioStarted
                    ? `${isPlaying ? "On Air" : "Leise"} · ${displaySlot.kind === "host" ? "Moderation" : displaySlot.title}`
                    : "Radio wartet"}
                </p>
              </div>
            </div>
            <div className="wheel">
              <button type="button" disabled aria-hidden="true">
                MENU
              </button>
              <button type="button" disabled aria-hidden="true">
                FM
              </button>
              <button type="button" disabled aria-hidden="true">
                103.7
              </button>
              <button className="play-label" type="button" onClick={onTogglePlayback}>
                {isPlaying ? "ON" : "OFF"}
              </button>
              <button className="center" type="button" onClick={onTogglePlayback}>
                <span className={`play-icon ${isPlaying ? "pause" : "play"}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
