"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const tracks = [
  { title: "Moment", artist: "C4RL", src: "/music/c4rl-moment.mp3" },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus", src: "/music/party-in-the-usa.mp3" },
  { title: "The One That Got Away", artist: "Katy Perry", src: "/music/the-one-that-got-away.mp3" },
  { title: "Call Me Maybe", artist: "Carly Rae Jepsen", src: "/music/call-me-maybe.mp3" },
  { title: "Kids", artist: "MGMT", src: "/music/mgmt-kids.mp3" },
  { title: "What Makes You Beautiful", artist: "One Direction", src: "/music/what-makes-you-beautiful.mp3" }
];

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingRadioStartRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setTrackProgress(0);
    if (pendingRadioStartRef.current || isPlaying) {
      const shouldJumpIntoSong = pendingRadioStartRef.current;
      pendingRadioStartRef.current = false;
      playSelectedTrack(shouldJumpIntoSong);
    }
  }, [activeTrack]);

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
    const nextIndex =
      tracks.length > 1 ? (activeTrack + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length : 0;
    setActiveTrack(nextIndex);
  }

  function playSelectedTrack(jumpIntoSong = false) {
    const audio = audioRef.current;
    if (!audio) return;

    const startAudio = () => {
      if (jumpIntoSong && Number.isFinite(audio.duration) && audio.duration > 24) {
        audio.currentTime = Math.floor(Math.random() * Math.max(1, audio.duration - 18));
      }

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
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
    const randomTrack = Math.floor(Math.random() * tracks.length);
    pendingRadioStartRef.current = true;

    if (randomTrack === activeTrack) {
      pendingRadioStartRef.current = false;
      playSelectedTrack(true);
      return;
    }

    setActiveTrack(randomTrack);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      startRadio();
      return;
    }

    audio.pause();
    setIsPlaying(false);
    setBeatPulse(0);
  }

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setTrackProgress((audio.currentTime / audio.duration) * 100);
    if (!audio.paused) {
      setBeatPulse(0.58 + Math.abs(Math.sin(audio.currentTime * 5.8)) * 0.4);
    }
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
              {!radioStarted ? (
                <div className="radio-start-screen">
                  <strong>START RADIO</strong>
                  <span>shuffle broadcast</span>
                  <small>press play</small>
                </div>
              ) : (
                <ol className="ipod-list">
                  {tracks.map((track, index) => (
                    <li className={index === activeTrack ? "active" : ""} key={track.src}>
                      <button
                        onClick={() => {
                          setRadioStarted(true);
                          setActiveTrack(index);
                        }}
                      >
                        <span>{track.title}</span>
                        <small>{track.artist}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="progress">
                <i style={{ width: `${trackProgress}%` }} />
              </div>
              <p className="ipod-status">
                {radioStarted ? `${isPlaying ? "On Air" : "Pause"} · ${tracks[activeTrack].title}` : "Radio wartet"}
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
