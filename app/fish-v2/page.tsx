"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const tracks = [
  { title: "Moment", artist: "C4RL", src: "/music/c4rl-moment.mp3" },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus", src: "/music/party-in-the-usa.mp3" },
  { title: "The One That Got Away", artist: "Katy Perry", src: "/music/the-one-that-got-away.mp3" }
];

export default function FishV2Gate() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [beatPulse, setBeatPulse] = useState(0);
  const [waveBars, setWaveBars] = useState(Array.from({ length: 14 }, () => 0.18));
  const [ipodTilt, setIpodTilt] = useState({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceConnectedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setTrackProgress(0);
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
  }, [activeTrack]);

  useEffect(() => {
    return () => stopReactiveLights();
  }, []);

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

  function previousTrack() {
    setActiveTrack((activeTrack + tracks.length - 1) % tracks.length);
  }

  function nextTrack() {
    setActiveTrack((activeTrack + 1) % tracks.length);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          startReactiveLights();
        })
        .catch(() => setIsPlaying(false));
      return;
    }

    audio.pause();
    setIsPlaying(false);
    stopReactiveLights();
  }

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setTrackProgress((audio.currentTime / audio.duration) * 100);
  }

  function startReactiveLights() {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;

    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      setBeatPulse(0.85);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    const context = audioContextRef.current;

    if (!analyserRef.current) {
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.smoothingTimeConstant = 0.72;
    }

    if (!sourceConnectedRef.current) {
      const source = context.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(context.destination);
      sourceConnectedRef.current = true;
    }

    context.resume().catch(() => undefined);
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);

    const animate = () => {
      const analyser = analyserRef.current;
      if (!analyser || audio.paused) return;

      analyser.getByteFrequencyData(data);
      const bass = data.slice(0, 12).reduce((sum, value) => sum + value, 0) / 12;
      const sparkle = data.slice(18, 42).reduce((sum, value) => sum + value, 0) / 24;
      const pulse = Math.min(1, Math.max(0.18, bass / 190 + sparkle / 520));
      setBeatPulse(pulse);
      setWaveBars((currentBars) =>
        currentBars.map((_, index) => {
          const start = Math.floor((index / currentBars.length) * data.length);
          const end = Math.max(start + 2, Math.floor(((index + 1) / currentBars.length) * data.length));
          const values = data.slice(start, end);
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          return Math.min(1, Math.max(0.12, average / 210));
        })
      );
      animationRef.current = window.requestAnimationFrame(animate);
    };

    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    animationRef.current = window.requestAnimationFrame(animate);
  }

  function stopReactiveLights() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setBeatPulse(0);
    setWaveBars(Array.from({ length: 14 }, () => 0.18));
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
        src={tracks[activeTrack].src}
        onTimeUpdate={updateProgress}
        onEnded={nextTrack}
        onPlay={() => {
          setIsPlaying(true);
          startReactiveLights();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopReactiveLights();
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
              <button className="active">Music</button>
            </div>
            <small>iPod von Kimon</small>
            <div>
              <ol className="ipod-list">
                {tracks.map((track, index) => (
                  <li className={index === activeTrack ? "active" : ""} key={track.src}>
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
              <div className="sound-wave" aria-hidden="true">
                {waveBars.map((height, index) => (
                  <span style={{ "--wave": height } as CSSProperties} key={index} />
                ))}
              </div>
              <p className="ipod-status">
                {isPlaying ? "Spielt" : "Pause"} · {tracks[activeTrack].title}
              </p>
            </div>
          </div>
          <div className="wheel">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              MENU
            </button>
            <button type="button" onClick={nextTrack}>▶▶</button>
            <button type="button" onClick={previousTrack}>◀◀</button>
            <button className="play-label" type="button" onClick={togglePlayback}>
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
            <button className="center" type="button" onClick={togglePlayback}>
              {isPlaying ? "Ⅱ" : "▶"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
