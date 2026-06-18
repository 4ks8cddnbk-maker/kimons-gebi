"use client";

import { FormEvent, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  fishRadioSongs as tracks,
  getFishRadioSlot,
  seekSyncedRadioAudio,
  type FishRadioSlot
} from "@/lib/fishRadio";

type PhoneApp = "home" | "photos" | "fish" | "maps" | "player" | "calendar" | "dresscode" | "karaoke" | "catering";
type GalleryPhoto = { url: string; caption?: string; uploadedAt?: string };
type Weather = { temperature: number; label: string };
type WallProfile = { id: string; name: string; handle: string; avatar?: string; createdAt: string };
type WallPost = { id: string; authorId: string; targetId: string; collaboratorId: string; text: string; createdAt: string };
type WallComment = { id: string; postId: string; authorId: string; text: string; createdAt: string };
type WallFollow = { followerId: string; followingId: string; createdAt: string };
type PhoneNotification = {
  id: string;
  text: string;
  detail: string;
  profileId: string;
  postId: string;
  createdAt: string;
};

const pinCode = "2406";
const appIcons: Array<{ id: PhoneApp; label: string; className: string; icon: string }> = [
  { id: "calendar", label: "Kalender", className: "calendar", icon: "27" },
  { id: "photos", label: "Fotos", className: "photos", icon: "✿" },
  { id: "fish", label: ".fish", className: "fish", icon: "" },
  { id: "maps", label: "Maps", className: "maps", icon: "⌖" },
  { id: "dresscode", label: "Dresscode", className: "dresscode", icon: "◆" },
  { id: "karaoke", label: "Karaoke", className: "karaoke", icon: "♫" },
  { id: "catering", label: "Catering", className: "catering", icon: "☕" },
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

function weatherLabel(code: number) {
  if ([0, 1].includes(code)) return "Klar";
  if ([2, 3].includes(code)) return "Wolkig";
  if ([45, 48].includes(code)) return "Nebel";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Aachen";
}

function relativeTime(value: string, now: Date) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "now";
  const diff = Math.max(0, now.getTime() - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "now";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  return `${Math.max(1, Math.floor(diff / day))}d`;
}

export default function FishV2Gate() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeApp, setActiveApp] = useState<PhoneApp>("home");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<Weather | null>(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [profiles, setProfiles] = useState<WallProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [wallComments, setWallComments] = useState<WallComment[]>([]);
  const [wallFollows, setWallFollows] = useState<WallFollow[]>([]);
  const [clearedNotifications, setClearedNotifications] = useState<string[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
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
  const dragStartYRef = useRef<number | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const displaySlot = radioStarted ? getFishRadioSlot(radioNow) : radioSlot;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;
  const phoneNotifications = useMemo(() => {
    if (!activeProfile) return [];

    const followNotes = wallFollows
      .filter((follow) => follow.followingId === activeProfile.id)
      .map((follow) => {
        const follower = profiles.find((profile) => profile.id === follow.followerId);
        return {
          id: `follow-${follow.followerId}`,
          text: `${follower?.name || "Jemand"} folgt dir jetzt.`,
          detail: "Tippen, um das Profil zu öffnen.",
          profileId: follow.followerId,
          postId: "",
          createdAt: follow.createdAt
        };
      });
    const collabNotes = wallPosts
      .filter((post) => post.collaboratorId === activeProfile.id && post.authorId !== activeProfile.id)
      .map((post) => {
        const author = profiles.find((profile) => profile.id === post.authorId);
        return {
          id: `collab-${post.id}`,
          text: `${author?.name || "Jemand"} hat dich in einem .fish markiert.`,
          detail: "Tippen, um den Post zu sehen.",
          profileId: post.targetId || post.authorId,
          postId: post.id,
          createdAt: post.createdAt
        };
      });
    const commentNotes = wallComments
      .filter((comment) => {
        const post = wallPosts.find((item) => item.id === comment.postId);
        return post?.authorId === activeProfile.id && comment.authorId !== activeProfile.id && !comment.text.startsWith("__reaction__:");
      })
      .map((comment) => {
        const author = profiles.find((profile) => profile.id === comment.authorId);
        const post = wallPosts.find((item) => item.id === comment.postId);
        return {
          id: `comment-${comment.id}`,
          text: `${author?.name || "Jemand"} hat dein .fish kommentiert.`,
          detail: comment.text.slice(0, 80),
          profileId: post?.targetId || post?.authorId || comment.authorId,
          postId: comment.postId,
          createdAt: comment.createdAt
        };
      });
    const profileNotes = profiles
      .filter((profile) => profile.id !== activeProfile.id && profile.createdAt)
      .map((profile) => ({
        id: `profile-${profile.id}`,
        text: `${profile.name} ist jetzt auch auf .fish!`,
        detail: "Sag hallo.",
        profileId: profile.id,
        postId: "",
        createdAt: profile.createdAt
      }));

    return [...commentNotes, ...collabNotes, ...followNotes, ...profileNotes]
      .filter((note) => !clearedNotifications.includes(note.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
  }, [activeProfile, clearedNotifications, profiles, wallComments, wallFollows, wallPosts]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPushEnabled(typeof Notification !== "undefined" && Notification.permission === "granted");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/fish-sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=50.7753&longitude=6.0839&current=temperature_2m,weather_code&timezone=Europe%2FBerlin")
      .then((response) => response.json())
      .then((data) => {
        const temperature = Math.round(Number(data?.current?.temperature_2m));
        const code = Number(data?.current?.weather_code);
        setWeather({
          temperature: Number.isFinite(temperature) ? temperature : 19,
          label: weatherLabel(code)
        });
      })
      .catch(() => setWeather(null));
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    Promise.all([
      fetch("/api/photos").then((response) => response.json()).catch(() => ({ photos: [] })),
      fetch("/api/walls/profiles", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ profiles: [], follows: [], activeProfileId: "" })),
      fetch("/api/walls/posts", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ posts: [] })),
      fetch("/api/walls/comments", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ comments: [] }))
    ]).then(([photoData, profileData, postData, commentData]) => {
      setPhotos(photoData.photos || []);
      setProfiles(profileData.profiles || []);
      setWallFollows(profileData.follows || []);
      setActiveProfileId(profileData.activeProfileId || "");
      setWallPosts(postData.posts || []);
      setWallComments(commentData.comments || []);
    });
  }, [unlocked]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("fish-cleared-notifications-v2") || "";
      const cookieMatch = document.cookie.match(/(?:^|; )fish_cleared_notifications=([^;]+)/);
      const fromStorage = stored ? JSON.parse(stored) : [];
      const fromCookie = cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : [];
      setClearedNotifications([...new Set([...(Array.isArray(fromStorage) ? fromStorage : []), ...(Array.isArray(fromCookie) ? fromCookie : [])])]);
    } catch {
      setClearedNotifications([]);
    }
  }, []);

  function saveClearedNotifications(ids: string[]) {
    const next = [...new Set(ids)];
    setClearedNotifications(next);
    try {
      window.localStorage.setItem("fish-cleared-notifications-v2", JSON.stringify(next));
      document.cookie = `fish_cleared_notifications=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // If browser storage is blocked, the notification disappears for this session.
    }
  }

  useEffect(() => {
    if (!pushEnabled || !phoneNotifications.length || typeof Notification === "undefined") return;

    const newest = phoneNotifications[0];
    if (notifiedIdsRef.current.has(newest.id)) return;
    notifiedIdsRef.current.add(newest.id);

    if (Notification.permission === "granted") {
      navigator.serviceWorker
        ?.getRegistration()
        .then((registration) => {
          if (registration) {
            registration.showNotification(".fish", {
              body: newest.text,
              icon: "/fish-app-icon.png",
              tag: newest.id
            });
          } else {
            new Notification(".fish", { body: newest.text, icon: "/fish-app-icon.png", tag: newest.id });
          }
        })
        .catch(() => new Notification(".fish", { body: newest.text, icon: "/fish-app-icon.png", tag: newest.id }));
    }
  }, [phoneNotifications, pushEnabled]);

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
    setNotificationCenterOpen(false);
    setActiveApp("home");
  }

  async function enablePushNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === "granted");
  }

  function startNotificationDrag(event: PointerEvent<HTMLButtonElement>) {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishNotificationDrag(event: PointerEvent<HTMLButtonElement>) {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;

    if (startY !== null && event.clientY - startY > 34) {
      setNotificationCenterOpen(true);
    }
  }

  function openNotification(notification: PhoneNotification) {
    const params = new URLSearchParams();
    if (notification.profileId) params.set("profile", notification.profileId);
    if (notification.postId) params.set("post", notification.postId);
    setActiveApp("fish");
    setNotificationCenterOpen(false);
    window.setTimeout(() => {
      const iframe = document.querySelector<HTMLIFrameElement>(".ios-fish-app iframe");
      if (iframe) iframe.src = `/walls?${params.toString()}`;
    }, 80);
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
                {activeApp === "home" && <HomeScreen onOpen={setActiveApp} now={now} weather={weather} />}
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
                    onOpenApp={setActiveApp}
                    now={now}
                  />
                )}
                <button
                  className="notification-grabber"
                  type="button"
                  onPointerDown={startNotificationDrag}
                  onPointerUp={finishNotificationDrag}
                  onClick={() => setNotificationCenterOpen((value) => !value)}
                  aria-label="Benachrichtigungen öffnen"
                />
                {notificationCenterOpen && (
                  <NotificationCenter
                    now={now}
                    notifications={phoneNotifications}
                    displaySlot={displaySlot}
                    radioStarted={radioStarted}
                    isPlaying={isPlaying}
                    onOpen={openNotification}
                    onDismiss={(id) => saveClearedNotifications([...clearedNotifications, id])}
                    onClearAll={() => saveClearedNotifications([...clearedNotifications, ...phoneNotifications.map((note) => note.id)])}
                    onEnablePush={enablePushNotifications}
                    pushEnabled={pushEnabled}
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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="ios-statusbar">
      <span>●●●○○ .fish</span>
      <strong>{now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</strong>
      <span>87%</span>
    </div>
  );
}

function HomeScreen({ onOpen, now, weather }: { onOpen: (app: PhoneApp) => void; now: Date; weather: Weather | null }) {
  return (
    <div className="ios-homescreen">
      <div className="ios-wallpaper" />
      <section className="ios-weather-widget" aria-label="Kimons Geburtstag">
        <div>
          <small>Aachen</small>
          <strong>{weather ? `${weather.temperature}°` : "--°"}</strong>
          <span>{weather?.label || "Wetter lädt"}</span>
        </div>
        <i />
        <ul>
          <li>{now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
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
  onTogglePlayback,
  onOpenApp,
  now
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
  onOpenApp: (app: PhoneApp) => void;
  now: Date;
}) {
  const title =
    app === "photos"
      ? "Fotos"
      : app === "fish"
        ? ".fish"
        : app === "maps"
          ? "Maps"
          : app === "calendar"
            ? "Kalender"
            : app === "dresscode"
              ? "Dresscode"
              : app === "karaoke"
                ? "Karaoke"
                : app === "catering"
                  ? "Catering"
                  : ".fish Player";

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
      {app === "calendar" && <CalendarApp onOpenMaps={() => onOpenApp("maps")} />}
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
      {app === "dresscode" && <DresscodeApp />}
      {app === "karaoke" && <KaraokeApp />}
      {app === "catering" && <CateringApp />}
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

function CalendarApp({ onOpenMaps }: { onOpenMaps: () => void }) {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);

  return (
    <div className="ios-calendar-app">
      <div className="calendar-toolbar">
        <button type="button">Today</button>
        <strong>Juni 2026</strong>
        <button type="button">+</button>
      </div>
      <div className="calendar-week">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <span className={day === 27 ? "birthday-day" : ""} key={day}>
            {day}
          </span>
        ))}
      </div>
      <article className="calendar-event">
        <small>27.06.2026 · 19:00</small>
        <strong>Kimons Geburtstag</strong>
        <button type="button" onClick={onOpenMaps}>
          Wendelinstraße 94, Aachen
        </button>
      </article>
    </div>
  );
}

function DresscodeApp() {
  return (
    <div className="ios-dresscode-app">
      <h2>Was anziehen?</h2>
      <p>Schick, aber entspannt. Stufe 6-10 ist der Sweet Spot.</p>
      <div className="phone-dress-scale">
        {Array.from({ length: 10 }, (_, index) => (
          <span className={index >= 5 ? "wanted" : ""} key={index + 1}>
            {index + 1}
          </span>
        ))}
      </div>
      <div className="phone-dress-cards">
        <article>
          <b>1-5</b>
          <span>Eher nicht: Jogger, normales Shirt, Badelatschen.</span>
        </article>
        <article className="good">
          <b>6-7</b>
          <span>Smart Casual: Hemd, Bluse, Chino, cleane Sneaker.</span>
        </article>
        <article className="good">
          <b>8-10</b>
          <span>Festlich: Blazer, Kleid, Statement-Look, gerne etwas Glam.</span>
        </article>
      </div>
    </div>
  );
}

function KaraokeApp() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const response = await fetch("/api/karaoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        song: form.get("song"),
        people: form.get("people"),
        notes: form.get("notes")
      })
    });
    const data = await response.json().catch(() => ({}));
    setState(response.ok ? "done" : "error");
    setMessage(data.message || (response.ok ? "Karaoke gespeichert." : "Das hat nicht geklappt."));
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="ios-karaoke-app" onSubmit={submit}>
      <h2>Karaoke</h2>
      <p>Jeder kann einen Song machen. Trag bitte ein, welchen Song und mit wem.</p>
      <input name="name" placeholder="Dein Name" required />
      <input name="song" placeholder="Song + Artist" required />
      <input name="people" placeholder="Mit wem machst du den Song?" required />
      <textarea name="notes" placeholder="Hinweis, Tonart, Acapella..." />
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sende..." : "Karaoke anmelden"}
      </button>
      {message && <span className={state}>{message}</span>}
    </form>
  );
}

function CateringApp() {
  return (
    <div className="ios-catering-app">
      <h2>Catering</h2>
      <div>
        <strong>Speisen</strong>
        <ul>
          <li>Hauptspeise wird noch festgelegt</li>
          <li>Vegetarische Option</li>
          <li>Snacks für später</li>
          <li>Kleine Dessert-Auswahl</li>
        </ul>
      </div>
      <div>
        <strong>Getränke</strong>
        <ul>
          <li>Softdrinks</li>
          <li>Wasser</li>
          <li>Bier</li>
          <li>Longdrink-Basis</li>
        </ul>
      </div>
    </div>
  );
}

function NotificationCenter({
  now,
  notifications,
  displaySlot,
  radioStarted,
  isPlaying,
  onOpen,
  onDismiss,
  onClearAll,
  onEnablePush,
  pushEnabled
}: {
  now: Date;
  notifications: PhoneNotification[];
  displaySlot: FishRadioSlot;
  radioStarted: boolean;
  isPlaying: boolean;
  onOpen: (notification: PhoneNotification) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onEnablePush: () => void;
  pushEnabled: boolean;
}) {
  return (
    <div className="ios-notification-center">
      <div className="notification-time">
        <strong>{now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</strong>
        <span>{now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>
      <div className="lockscreen-player">
        <span>103.7 .fish FM</span>
        <strong>{radioStarted ? (displaySlot.kind === "host" ? "Moderation" : `${displaySlot.title} - ${displaySlot.artist}`) : "Radio bereit"}</strong>
        <small>{isPlaying ? "On Air" : "Pause"}</small>
      </div>
      <div className="notification-center-head">
        <strong>.fish Benachrichtigungen</strong>
        <div>
          <button type="button" onClick={onEnablePush}>
            {pushEnabled ? "push an" : "push aktivieren"}
          </button>
          {notifications.length > 0 && (
            <button type="button" onClick={onClearAll}>
              clear all
            </button>
          )}
        </div>
      </div>
      <div className="phone-notifications">
        {notifications.length ? (
          notifications.map((notification) => (
            <article key={notification.id} className="phone-notification">
              <button type="button" onClick={() => onOpen(notification)}>
                <small>.fish <i>{relativeTime(notification.createdAt, now)}</i></small>
                <strong>{notification.text}</strong>
                <span>{notification.detail}</span>
              </button>
              <button type="button" onClick={() => onDismiss(notification.id)} aria-label="Benachrichtigung löschen">
                löschen
              </button>
            </article>
          ))
        ) : (
          <p>Keine neuen Nachrichten.</p>
        )}
      </div>
    </div>
  );
}
