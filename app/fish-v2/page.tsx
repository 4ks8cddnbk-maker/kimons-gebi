"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { fishRadioSongs as tracks, getFishRadioSlot, seekSyncedRadioAudio, type FishRadioSlot } from "@/lib/fishRadio";

export default function FishV2Gate() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
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
    const slot = getFishRadioSlot();
    if (slot.kind === "host" && slot.src === radioSlot.src) {
      window.setTimeout(startRadio, Math.max(400, (slot.duration - slot.elapsed) * 1000 + 150));
      return;
    }

    startRadio();
  }

  function tiltIpod(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    const y = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    setIpodTilt({ x, y });
  }

  return (
    <main className="fish-v2-gate">
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
        <div className="v2-window v2-super-window">
          <div className="myspace-topbar">
            <span />
            <span />
            <span />
            <strong>.fish V2.0</strong>
          </div>
          <div className="v2-window-body">
            <h1>currently working on .fish V2, stay tuned for our largest update.</h1>
          </div>
        </div>
      </section>

      <section
        className={`section ipod-section v2-preview-ipod ${isPlaying ? "party-mode" : ""}`}
        style={{ "--beat": beatPulse } as CSSProperties}
      >
        <div
          className="ipod"
          onMouseMove={tiltIpod}
          onMouseLeave={() => setIpodTilt({ x: 0, y: 0 })}
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
                  ? `${isPlaying ? "On Air" : "Pause"} · ${displaySlot.kind === "host" ? "Moderation" : displaySlot.title}`
                  : "Radio wartet"}
              </p>
            </div>
          </div>
          <div className="wheel">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              MENU
            </button>
            <button type="button" disabled aria-hidden="true">FM</button>
            <button type="button" disabled aria-hidden="true">103.7</button>
            <button className="play-label" type="button" onClick={togglePlayback}>
              {isPlaying ? "OFF" : "ON"}
            </button>
            <button className="center" type="button" onClick={togglePlayback}>
              <span className={`play-icon ${isPlaying ? "pause" : "play"}`} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
