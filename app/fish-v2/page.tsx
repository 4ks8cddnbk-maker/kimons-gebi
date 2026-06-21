"use client";

import { FormEvent, MouseEvent, PointerEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  fishRadioSongs as tracks,
  getFishRadioSlot,
  seekSyncedRadioAudio,
  type FishRadioSlot
} from "@/lib/fishRadio";
import { playClick, playKey, playLock, playTritone, playUnlock, isSoundEnabled, setSoundEnabled } from "@/lib/sound";

// Lightweight global so any in-phone screen can raise a skeuomorphic blue alert
// without prop-drilling. FishV2Gate listens for these events and renders it.
type AquaAlertDetail = { title: string; body: string };
function fireAquaAlert(title: string, body: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AquaAlertDetail>("aqua-alert", { detail: { title, body } }));
  }
}

type PhoneApp = "home" | "photos" | "fish" | "maps" | "player" | "calendar" | "dresscode" | "karaoke" | "catering" | "snake";
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
const siteCookieName = "kimon_v2_access";
const siteCookieValue = "fish-v2-ok";
const phoneClearedNotificationsKey = "fish-phone-cleared-notifications-v1";
const phoneClearedNotificationsCookie = "fish_phone_cleared_notifications";
const phoneSeenNotificationsKey = "fish-phone-seen-notifications-v1";
const phoneSeenNotificationsCookie = "fish_phone_seen_notifications";
const appIcons: Array<{ id: PhoneApp; label: string; className: string; icon: string }> = [
  { id: "calendar", label: "Kalender", className: "calendar", icon: "27" },
  { id: "photos", label: "Fotos", className: "photos", icon: "✿" },
  { id: "fish", label: ".fish", className: "fish", icon: "" },
  { id: "maps", label: "Maps", className: "maps", icon: "⌖" },
  { id: "dresscode", label: "Dresscode", className: "dresscode", icon: "◆" },
  { id: "karaoke", label: "Karaoke", className: "karaoke", icon: "♫" },
  { id: "catering", label: "Catering", className: "catering", icon: "☕" },
  { id: "player", label: "Player", className: "player", icon: "♪" },
  { id: "snake", label: "Snake", className: "snake", icon: "" }
];
const homeAppPages = [appIcons.slice(0, 8), appIcons.slice(8)];

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

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    if (window.localStorage.getItem("fish-haptics-enabled-v1") === "0") return;
  } catch {
    // ignore storage errors and vibrate anyway
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on vibrate inside non-user gestures; ignore.
  }
}

function originFromEvent(event: MouseEvent<HTMLElement>) {
  const screen = event.currentTarget.closest(".iphone-screen");
  const target = event.currentTarget.getBoundingClientRect();
  if (!screen) return "50% 46%";
  const box = screen.getBoundingClientRect();
  const x = Math.round(target.left + target.width / 2 - box.left);
  const y = Math.round(target.top + target.height / 2 - box.top);
  return `${x}px ${y}px`;
}

export default function FishV2Gate() {
  const [unlocked, setUnlocked] = useState(false);
  const [booting, setBooting] = useState(true);
  const [openOrigin, setOpenOrigin] = useState("50% 46%");
  const [aquaAlert, setAquaAlert] = useState<AquaAlertDetail | null>(null);
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
  const [seenNotifications, setSeenNotifications] = useState<string[]>([]);
  const [phonePush, setPhonePush] = useState<PhoneNotification | null>(null);
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
  const lastNotifIdRef = useRef("");

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
  const unseenPhoneNotifications = useMemo(
    () => phoneNotifications.filter((note) => !seenNotifications.includes(note.id)),
    [phoneNotifications, seenNotifications]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    // Boot sequence runs once per page load: black → logo → lock screen.
    const timer = window.setTimeout(() => setBooting(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onAlert(event: Event) {
      setAquaAlert((event as CustomEvent<AquaAlertDetail>).detail);
    }
    window.addEventListener("aqua-alert", onAlert);
    return () => window.removeEventListener("aqua-alert", onAlert);
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
      const stored = window.localStorage.getItem(phoneClearedNotificationsKey) || "";
      const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${phoneClearedNotificationsCookie}=([^;]+)`));
      const fromStorage = stored ? JSON.parse(stored) : [];
      const fromCookie = cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : [];
      setClearedNotifications([...new Set([...(Array.isArray(fromStorage) ? fromStorage : []), ...(Array.isArray(fromCookie) ? fromCookie : [])])]);
    } catch {
      setClearedNotifications([]);
    }

    try {
      const stored = window.localStorage.getItem(phoneSeenNotificationsKey) || "";
      const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${phoneSeenNotificationsCookie}=([^;]+)`));
      const fromStorage = stored ? JSON.parse(stored) : [];
      const fromCookie = cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : [];
      setSeenNotifications([...new Set([...(Array.isArray(fromStorage) ? fromStorage : []), ...(Array.isArray(fromCookie) ? fromCookie : [])])]);
    } catch {
      setSeenNotifications([]);
    }
  }, []);

  function saveClearedNotifications(ids: string[]) {
    const next = [...new Set(ids)];
    setClearedNotifications(next);
    try {
      window.localStorage.setItem(phoneClearedNotificationsKey, JSON.stringify(next));
      document.cookie = `${phoneClearedNotificationsCookie}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // If browser storage is blocked, the notification disappears for this session.
    }
  }

  function saveSeenNotifications(ids: string[]) {
    const next = [...new Set(ids)];
    setSeenNotifications(next);
    try {
      window.localStorage.setItem(phoneSeenNotificationsKey, JSON.stringify(next));
      document.cookie = `${phoneSeenNotificationsCookie}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Session-only fallback.
    }
  }

  function markNotificationsSeen(ids: string[]) {
    if (!ids.length) return;
    saveSeenNotifications([...seenNotifications, ...ids]);
  }

  useEffect(() => {
    if (!pushEnabled || !unseenPhoneNotifications.length || typeof Notification === "undefined") return;

    const newest = unseenPhoneNotifications[0];
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
  }, [pushEnabled, unseenPhoneNotifications]);

  useEffect(() => {
    const newest = unseenPhoneNotifications[0];
    if (!newest) return;
    if (lastNotifIdRef.current && lastNotifIdRef.current !== newest.id) {
      playTritone();
      vibrate([30, 40, 30]);
    }
    lastNotifIdRef.current = newest.id;
  }, [unseenPhoneNotifications]);

  useEffect(() => {
    const newest = unseenPhoneNotifications[0];
    if (!newest || activeApp === "fish" || notificationCenterOpen || !unlocked) return;
    setPhonePush(newest);
    const timer = window.setTimeout(() => setPhonePush(null), 5200);
    return () => window.clearTimeout(timer);
  }, [activeApp, notificationCenterOpen, unlocked, unseenPhoneNotifications]);

  useEffect(() => {
    if (!notificationCenterOpen) return;
    markNotificationsSeen(phoneNotifications.map((note) => note.id));
  }, [notificationCenterOpen, phoneNotifications]);

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
      vibrate([40, 60, 40]);
      window.setTimeout(() => {
        setPin("");
        setPinError(false);
      }, 520);
      return;
    }

    vibrate(18);
    playUnlock();
    await fetch("/api/site-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pinCode })
    });
    document.cookie = `${siteCookieName}=${siteCookieValue}; path=/; SameSite=Lax`;
    setUnlocked(true);
    setActiveApp("home");
  }

  function pressDigit(digit: string) {
    if (pin.length >= 4 || pinError) return;
    vibrate(5);
    playKey();
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === 4) submitPin(nextPin);
  }

  function launchApp(app: PhoneApp, event?: MouseEvent<HTMLElement>) {
    if (event) setOpenOrigin(originFromEvent(event));
    vibrate(8);
    if (app === "home") playLock();
    else playClick();
    setActiveApp(app);
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
    vibrate(8);
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

  function moveNotificationDrag(event: PointerEvent<HTMLButtonElement>) {
    const startY = dragStartYRef.current;
    if (startY === null) return;
    if (event.clientY - startY > 36) {
      dragStartYRef.current = null;
      setNotificationCenterOpen(true);
    }
  }

  function startNotificationTouch(event: TouchEvent<HTMLButtonElement>) {
    dragStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function moveNotificationTouch(event: TouchEvent<HTMLButtonElement>) {
    const startY = dragStartYRef.current;
    if (startY === null) return;
    const y = event.touches[0]?.clientY ?? startY;
    if (y - startY > 36) {
      dragStartYRef.current = null;
      setNotificationCenterOpen(true);
    }
  }

  function finishNotificationTouch(event: TouchEvent<HTMLButtonElement>) {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;
    if (startY === null) return;
    const y = event.changedTouches[0]?.clientY ?? startY;
    if (y - startY > 30) setNotificationCenterOpen(true);
  }

  function openNotification(notification: PhoneNotification) {
    markNotificationsSeen([notification.id]);
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
            {booting && <BootScreen />}
            {!unlocked ? (
              <LockScreen pin={pin} pinError={pinError} onPress={pressDigit} onReset={() => setPin("")} />
            ) : (
              <>
                <PhoneStatusBar />
                {activeApp === "home" && <HomeScreen onOpen={launchApp} now={now} weather={weather} />}
                {activeApp !== "home" && (
                  <AppScreen
                    app={activeApp}
                    origin={openOrigin}
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
                    onOpenApp={launchApp}
                    now={now}
                  />
                )}
                {!notificationCenterOpen && (
                  <button
                    className="notification-grabber"
                    type="button"
                    onPointerDown={startNotificationDrag}
                    onPointerMove={moveNotificationDrag}
                    onPointerUp={finishNotificationDrag}
                    onTouchStart={startNotificationTouch}
                    onTouchMove={moveNotificationTouch}
                    onTouchEnd={finishNotificationTouch}
                    onClick={() => setNotificationCenterOpen((value) => !value)}
                    aria-label="Benachrichtigungen öffnen"
                  />
                )}
                {phonePush && !notificationCenterOpen && activeApp !== "fish" && (
                  <PhonePushBanner
                    notification={phonePush}
                    now={now}
                    onOpen={openNotification}
                    onDismiss={() => {
                      markNotificationsSeen([phonePush.id]);
                      setPhonePush(null);
                    }}
                  />
                )}
                {aquaAlert && <AquaAlert title={aquaAlert.title} body={aquaAlert.body} onClose={() => setAquaAlert(null)} />}
                {notificationCenterOpen && (
                  <NotificationCenter
                    now={now}
                    notifications={phoneNotifications}
                    displaySlot={displaySlot}
                    radioStarted={radioStarted}
                    isPlaying={isPlaying}
                    onOpen={openNotification}
                    onDismiss={(id) => saveClearedNotifications([...clearedNotifications, id])}
                    onClearAll={() => {
                      const ids = phoneNotifications.map((note) => note.id);
                      saveClearedNotifications([...clearedNotifications, ...ids]);
                      saveSeenNotifications([...seenNotifications, ...ids]);
                    }}
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
  const [slid, setSlid] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  function cancel() {
    setSlid(false);
    onReset();
  }

  return (
    <div className="ios-lockscreen">
      <div className="ios-lock-status">
        <span className="ios-signal" aria-hidden="true" />
        <strong>KIMON</strong>
        <span className="ios-battery" aria-hidden="true" />
      </div>

      {!slid ? (
        <div className="ios-lock-face">
          <time className="ios-lock-clock">
            {now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </time>
          <span className="ios-lock-date">
            {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <SlideToUnlock onUnlock={() => setSlid(true)} />
        </div>
      ) : (
        <div className={`passcode-panel ${pinError ? "shake" : ""}`}>
          <h1>Code eingeben</h1>
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
      )}

      <div className="lock-actions">
        <button type="button">Notruf</button>
        {slid ? (
          <button type="button" onClick={cancel}>
            Abbrechen
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function SlideToUnlock({ onUnlock }: { onUnlock: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; max: number } | null>(null);

  function maxOffset() {
    const track = trackRef.current;
    if (!track) return 0;
    return Math.max(0, track.clientWidth - 64);
  }

  function begin(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, max: maxOffset() };
    setDragging(true);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    const next = Math.min(dragRef.current.max, Math.max(0, event.clientX - dragRef.current.startX));
    setOffset(next);
  }

  function end() {
    const data = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (data && offset > data.max * 0.7) {
      setOffset(data.max);
      window.setTimeout(onUnlock, 140);
    } else {
      setOffset(0);
    }
  }

  return (
    <div className="slide-to-unlock" ref={trackRef}>
      <span className="slide-text">entsperren</span>
      <span className="slide-hint" aria-hidden="true">›››</span>
      <button
        type="button"
        className={`slide-knob ${dragging ? "dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClick={onUnlock}
        aria-label="Zum Entsperren schieben"
      >
        ›
      </button>
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
      <span><i className="ios-signal" aria-hidden="true" /> .fish</span>
      <strong>{now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</strong>
      <span className="ios-battery" aria-hidden="true" />
    </div>
  );
}

function HomeScreen({
  onOpen,
  now,
  weather
}: {
  onOpen: (app: PhoneApp, event?: MouseEvent<HTMLElement>) => void;
  now: Date;
  weather: Weather | null;
}) {
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function finishSwipe(x: number) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = x - start;
    if (Math.abs(delta) < 42) return;
    setPage((current) => Math.min(homeAppPages.length - 1, Math.max(0, current + (delta < 0 ? 1 : -1))));
  }

  return (
    <div className="ios-homescreen">
      <div className="ios-wallpaper" />
      <WeatherWidget now={now} weather={weather} />
      <div
        className="ios-home-pages"
        onTouchStart={(event: TouchEvent<HTMLDivElement>) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event: TouchEvent<HTMLDivElement>) => {
          finishSwipe(event.changedTouches[0]?.clientX ?? 0);
        }}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === "mouse") touchStartX.current = event.clientX;
        }}
        onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === "mouse") finishSwipe(event.clientX);
        }}
      >
        <div className="ios-home-pages-track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {homeAppPages.map((apps, pageIndex) => (
            <div className="ios-app-grid" key={pageIndex}>
              {apps.map((app) => (
                <button key={app.id} type="button" className="ios-app" onClick={(event) => onOpen(app.id, event)}>
                  <span className={`ios-app-icon ${app.className}`}>
                    {app.id === "fish" ? <img src="/fish-app-icon.png" alt="" /> : app.id === "snake" ? <SnakeIcon /> : app.icon}
                  </span>
                  <strong>{app.label}</strong>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="ios-page-dots" aria-label={`Homescreen Seite ${page + 1} von ${homeAppPages.length}`}>
          {homeAppPages.map((_, index) => (
            <button
              key={index}
              type="button"
              className={index === page ? "active" : ""}
              onClick={() => setPage(index)}
              aria-label={`Seite ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="ios-dock">
        <button type="button" className="ios-app mini" onClick={(event) => onOpen("fish", event)}>
          <span className="ios-app-icon fish">
            <img src="/fish-app-icon.png" alt="" />
          </span>
        </button>
        <button type="button" className="ios-app mini" onClick={(event) => onOpen("maps", event)}>
          <span className="ios-app-icon maps">⌖</span>
        </button>
        <button type="button" className="ios-app mini" onClick={(event) => onOpen("player", event)}>
          <span className="ios-app-icon player">♪</span>
        </button>
      </div>
    </div>
  );
}

function SnakeIcon() {
  return (
    <span className="snake-icon-art" aria-hidden="true">
      <i />
      <i />
      <i />
      <b />
    </span>
  );
}

function skyPhase(hour: number) {
  if (hour < 6 || hour >= 21) return "night";
  if (hour < 8 || hour >= 19) return "golden";
  return "day";
}

function skyCondition(label?: string) {
  if (!label) return "clear";
  if (/Regen/i.test(label)) return "rain";
  if (/Schnee/i.test(label)) return "snow";
  if (/Gewitter/i.test(label)) return "storm";
  if (/Wolk|Nebel/i.test(label)) return "clouds";
  return "clear";
}

function WeatherWidget({ now, weather }: { now: Date; weather: Weather | null }) {
  const phase = skyPhase(now.getHours());
  const cond = skyCondition(weather?.label);

  return (
    <section className={`ios-weather-widget sky-${phase} cond-${cond}`} aria-label="Wetter in Aachen">
      <div className="weather-sky" aria-hidden="true">
        <span className="sky-sun" />
        <span className="sky-moon" />
        <span className="sky-stars" />
        <span className="sky-cloud c1" />
        <span className="sky-cloud c2" />
        <span className="sky-cloud c3" />
        <span className="sky-rain" />
      </div>
      <div className="weather-info">
        <small>Aachen</small>
        <strong>{weather ? `${weather.temperature}°` : "--°"}</strong>
        <span>{weather?.label || "Wetter lädt"}</span>
      </div>
      <ul>
        <li>{now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</li>
        <li>Wendelinstraße 94</li>
      </ul>
    </section>
  );
}

function BootScreen() {
  return (
    <div className="boot-screen" aria-hidden="true">
      <img className="boot-logo" src="/fish-app-icon.png" alt="" />
      <span className="boot-spinner" />
    </div>
  );
}

function AppScreen({
  app,
  origin,
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
  origin: string;
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
  onOpenApp: (app: PhoneApp, event?: MouseEvent<HTMLElement>) => void;
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
                    : app === "snake"
                      ? "Snake"
                      : ".fish Player";

  return (
    <div className={`ios-app-screen app-${app}`} style={{ transformOrigin: origin }}>
      <header className="ios-app-header">
        <button type="button" className="ios-app-back" onClick={() => onOpenApp("home")} aria-label="Zurück zum Home-Bildschirm">
          ‹
        </button>
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
          <iframe title=".fish" src="/walls?inside=phone" />
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
          <div className="map-pin-overlay" aria-hidden="true">
            <span className="map-pin-pulse" />
            <span className="map-pin" />
          </div>
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
      {app === "snake" && <SnakeApp />}
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

type SnakePoint = { x: number; y: number };
const snakeSize = 11;

function samePoint(a: SnakePoint, b: SnakePoint) {
  return a.x === b.x && a.y === b.y;
}

function nextSnakeFood(body: SnakePoint[]) {
  for (let y = 2; y < snakeSize; y += 3) {
    for (let x = 2; x < snakeSize; x += 2) {
      if (!body.some((part) => part.x === x && part.y === y)) return { x, y };
    }
  }
  return { x: snakeSize - 2, y: snakeSize - 2 };
}

function SnakeApp() {
  const [snake, setSnake] = useState<SnakePoint[]>([
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 }
  ]);
  const [food, setFood] = useState<SnakePoint>({ x: 8, y: 5 });
  const [direction, setDirection] = useState<SnakePoint>({ x: 1, y: 0 });
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const swipeStartRef = useRef<SnakePoint | null>(null);

  useEffect(() => {
    if (!running || gameOver) return;
    const interval = window.setInterval(() => {
      setSnake((current) => {
        const head = current[0];
        const nextHead = {
          x: (head.x + direction.x + snakeSize) % snakeSize,
          y: (head.y + direction.y + snakeSize) % snakeSize
        };
        if (current.some((part) => samePoint(part, nextHead))) {
          setRunning(false);
          setGameOver(true);
          return current;
        }
        const ate = samePoint(nextHead, food);
        const next = [nextHead, ...current];
        if (!ate) next.pop();
        else setFood(nextSnakeFood(next));
        return next;
      });
    }, 170);
    return () => window.clearInterval(interval);
  }, [direction, food, gameOver, running]);

  function reset() {
    const start = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 }
    ];
    setSnake(start);
    setFood({ x: 8, y: 5 });
    setDirection({ x: 1, y: 0 });
    setGameOver(false);
    setRunning(true);
  }

  function turn(next: SnakePoint) {
    setRunning(true);
    setDirection((current) => {
      if (current.x + next.x === 0 && current.y + next.y === 0) return current;
      return next;
    });
  }

  function startSwipe(x: number, y: number) {
    swipeStartRef.current = { x, y };
  }

  function finishSnakeSwipe(x: number, y: number) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      setRunning((value) => !value);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) turn({ x: dx > 0 ? 1 : -1, y: 0 });
    else turn({ x: 0, y: dy > 0 ? 1 : -1 });
  }

  return (
    <div className="ios-snake-app">
      <div className="snake-score-card">
        <small>iPod Classic Mode</small>
        <strong>{gameOver ? "Game Over" : running ? "Snake läuft" : "Snake bereit"}</strong>
        <span>Score {Math.max(0, snake.length - 3)}</span>
      </div>
      <div
        className="phone-snake-board"
        aria-label="Snake Spielfeld"
        onTouchStart={(event) => startSwipe(event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0)}
        onTouchEnd={(event) => finishSnakeSwipe(event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0)}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") startSwipe(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") finishSnakeSwipe(event.clientX, event.clientY);
        }}
      >
        {Array.from({ length: snakeSize * snakeSize }, (_, index) => {
          const point = { x: index % snakeSize, y: Math.floor(index / snakeSize) };
          const bodyIndex = snake.findIndex((part) => samePoint(part, point));
          const isFood = samePoint(food, point);
          return <span className={`${bodyIndex === 0 ? "head" : bodyIndex > 0 ? "body" : ""} ${isFood ? "food" : ""}`} key={index} />;
        })}
      </div>
      <p className="snake-swipe-hint">Wische über das Feld, um die Richtung zu ändern. Tippen startet oder pausiert.</p>
      <div className="snake-controls">
        <button type="button" className="snake-main" onClick={gameOver ? reset : () => setRunning((value) => !value)}>
          {gameOver ? "Neu" : running ? "Pause" : "Start"}
        </button>
      </div>
    </div>
  );
}

function CalendarApp({ onOpenMaps }: { onOpenMaps: () => void }) {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  // Monday-first leading blanks so the 27th lands on the right weekday.
  const leadingBlanks = (new Date(2026, 5, 1).getDay() + 6) % 7;

  return (
    <div className="ios-calendar-app">
      <div className="calendar-toolbar">
        <button type="button">Heute</button>
        <strong>Juni 2026</strong>
        <button type="button">+</button>
      </div>
      <div className="calendar-page">
        <div className="calendar-week">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span className="calendar-empty" key={`blank-${index}`} />
          ))}
          {days.map((day) => (
            <span className={day === 27 ? "birthday-day" : ""} key={day}>
              {day}
            </span>
          ))}
        </div>
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
    if (response.ok) {
      event.currentTarget.reset();
      fireAquaAlert("Karaoke", "Dein Song ist eingetragen. Wir sehen uns am Mikro!");
    }
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={`ios-toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="ios-toggle-knob" />
    </button>
  );
}

function SettingsApp() {
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    setSound(isSoundEnabled());
    try {
      setHaptics(window.localStorage.getItem("fish-haptics-enabled-v1") !== "0");
    } catch {
      setHaptics(true);
    }
  }, []);

  return (
    <div className="ios-settings-app">
      <p className="settings-group-title">Allgemein</p>
      <div className="settings-group">
        <div className="settings-row">
          <span>Töne</span>
          <Toggle
            checked={sound}
            onChange={(value) => {
              setSound(value);
              setSoundEnabled(value);
              if (value) playClick();
            }}
          />
        </div>
        <div className="settings-row">
          <span>Vibration</span>
          <Toggle
            checked={haptics}
            onChange={(value) => {
              setHaptics(value);
              try {
                window.localStorage.setItem("fish-haptics-enabled-v1", value ? "1" : "0");
              } catch {
                // ignore
              }
              if (value && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
            }}
          />
        </div>
      </div>

      <p className="settings-group-title">Über dieses Telefon</p>
      <div className="settings-group">
        <div className="settings-row">
          <span>Name</span>
          <b>Kimon</b>
        </div>
        <div className="settings-row">
          <span>System</span>
          <b>.fish OS 4</b>
        </div>
        <div className="settings-row">
          <span>Modell</span>
          <b>iPhone 4 · Kimon Edition</b>
        </div>
        <div className="settings-row">
          <span>Anlass</span>
          <b>23. Geburtstag</b>
        </div>
        <div className="settings-row">
          <span>Termin</span>
          <b>27.06.2026 · 19:00</b>
        </div>
      </div>
      <p className="settings-footnote">Mit Liebe gebaut für Kimon. .fish FM 103.7</p>
    </div>
  );
}

function AquaAlert({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <div className="aqua-alert-backdrop" role="alertdialog" aria-modal="true">
      <div className="aqua-alert">
        <strong>{title}</strong>
        <p>{body}</p>
        <button type="button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

function PhonePushBanner({
  notification,
  now,
  onOpen,
  onDismiss
}: {
  notification: PhoneNotification;
  now: Date;
  onOpen: (notification: PhoneNotification) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="phone-push-banner" role="status">
      <button type="button" onClick={() => onOpen(notification)}>
        <small>
          .fish <i>{relativeTime(notification.createdAt, now)}</i>
        </small>
        <strong>{notification.text}</strong>
        <span>{notification.detail}</span>
      </button>
      <button type="button" onClick={onDismiss} aria-label="Banner schließen">
        ×
      </button>
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
  onClearAll
}: {
  now: Date;
  notifications: PhoneNotification[];
  displaySlot: FishRadioSlot;
  radioStarted: boolean;
  isPlaying: boolean;
  onOpen: (notification: PhoneNotification) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
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
      {notifications.length > 0 && (
        <button className="notification-clear-all" type="button" onClick={onClearAll}>
          alle löschen
        </button>
      )}
    </div>
  );
}
