"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type WallPost = {
  id: string;
  authorId: string;
  targetId: string;
  collaboratorId: string;
  postType: string;
  text: string;
  sticker: string;
  color: string;
  mediaUrl: string;
  songTitle: string;
  songArtist: string;
  songSrc: string;
  createdAt: string;
};

type WallComment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

type Profile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  mood: string;
  song: string;
  theme: string;
  pattern: string;
  stickerPack: string;
  headline: string;
  glitter: boolean;
  backgroundColor: string;
  accentColor: string;
  fontStyle: string;
  layoutDensity: string;
  verified: boolean;
  photos: string[];
};

type Follow = {
  followerId: string;
  followingId: string;
  createdAt: string;
};

const tracks = [
  { title: "Moment", artist: "C4RL", src: "/music/c4rl-moment.mp3" },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus", src: "/music/party-in-the-usa.mp3" },
  { title: "The One That Got Away", artist: "Katy Perry", src: "/music/the-one-that-got-away.mp3" },
  { title: "Call Me Maybe", artist: "Carly Rae Jepsen", src: "/music/call-me-maybe.mp3" },
  { title: "Kids", artist: "MGMT", src: "/music/mgmt-kids.mp3" },
  { title: "What Makes You Beautiful", artist: "One Direction", src: "/music/what-makes-you-beautiful.mp3" },
  { title: "Beauty And A Beat", artist: "Justin Bieber ft. Nicki Minaj", src: "/music/beauty-and-a-beat.mp3" },
  { title: "TiK ToK", artist: "Ke$ha", src: "/music/tik-tok.mp3" }
];

const reactionPrefix = "__reaction__:";
const reactionOptions = [
  { key: "thumbs-up", label: "Daumen hoch" },
  { key: "wow", label: "Erstaunt" },
  { key: "heart-eyes", label: "Herzaugen" },
  { key: "laugh-cry", label: "Lacht" },
  { key: "hundred", label: "100!" }
];

const themeOptions = [
  { value: "blue", label: "Aqua Blau", accent: "#66b9f1", background: "#dcecff" },
  { value: "green", label: "Limewire Gruen", accent: "#33b75a", background: "#dff7e5" },
  { value: "pink", label: "MySpace Pink", accent: "#ec6fa9", background: "#ffe4f0" },
  { value: "gold", label: "iPod Gold", accent: "#d9a626", background: "#fff3ca" },
  { value: "purple", label: "Neon Lila", accent: "#8a6dff", background: "#ece8ff" },
  { value: "black", label: "Black Chrome", accent: "#20293a", background: "#dfe4ec" }
];
const patternOptions = [
  { value: "aqua", label: "Aqua Streifen" },
  { value: "stars", label: "Sterne" },
  { value: "checker", label: "Checkerboard" },
  { value: "hearts", label: "Hearts" },
  { value: "scanlines", label: "CRT Lines" }
];
const fontOptions = [
  { value: "lucida", label: "Aqua Sans" },
  { value: "pixel", label: "Pixel Arcade" },
  { value: "script", label: "Glitzer Script" },
  { value: "bubble", label: "Bubble Pop" },
  { value: "editorial", label: "Editorial Serif" }
];
const densityOptions = [
  { value: "compact", label: "Kompakt" },
  { value: "cozy", label: "Normal" },
  { value: "loud", label: "Maximal MySpace" }
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHandle(handle: string) {
  return handle
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function relativeTimeLabel(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "gerade eben";

  const diff = Math.max(0, Date.now() - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;

  if (diff < minute) return "vor unter einer Minute";
  if (diff < hour) {
    const amount = Math.max(1, Math.floor(diff / minute));
    return `vor ${amount} Minute${amount === 1 ? "" : "n"}`;
  }
  if (diff < day) {
    const amount = Math.max(1, Math.floor(diff / hour));
    return `vor ${amount} Stunde${amount === 1 ? "" : "n"}`;
  }
  if (diff < month) {
    const amount = Math.max(1, Math.floor(diff / day));
    return `vor ${amount} Tag${amount === 1 ? "" : "en"}`;
  }

  const amount = Math.max(1, Math.floor(diff / month));
  return `vor ${amount} Monat${amount === 1 ? "" : "en"}`;
}

function ReactionIcon({ type }: { type: string }) {
  if (type === "thumbs-up") {
    return (
      <svg className="reaction-svg reaction-thumbs-up" viewBox="0 0 42 42" aria-hidden="true">
        <defs>
          <linearGradient id="thumbAqua" x1="8" x2="34" y1="6" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.38" stopColor="#7bd5ff" />
            <stop offset="1" stopColor="#2477c8" />
          </linearGradient>
        </defs>
        <path d="M14 18h-4.5c-1.5 0-2.5 1.1-2.5 2.6v13c0 1.5 1 2.4 2.5 2.4H14z" fill="#1e75bc" />
        <path
          d="M15 17.6c3.7-3.3 5.5-6.2 6.5-10.2.4-1.6 2.2-2.4 3.7-1.6 1.8.9 2.1 3.2 1.4 6.2l-.7 2.9h6.7c2.3 0 4.2 2 3.8 4.3l-2.2 12.7c-.4 2.4-2.5 4.1-4.9 4.1H15z"
          fill="url(#thumbAqua)"
          stroke="#18588f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M17.5 20.8h14.2" stroke="#fff" strokeLinecap="round" strokeWidth="2" opacity="0.72" />
      </svg>
    );
  }

  if (type === "wow") {
    return (
      <svg className="reaction-svg reaction-wow" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="17" fill="#ffcf5a" stroke="#a86b00" strokeWidth="2" />
        <ellipse cx="15" cy="17" rx="2.7" ry="4.3" fill="#24334a" />
        <ellipse cx="27" cy="17" rx="2.7" ry="4.3" fill="#24334a" />
        <ellipse cx="21" cy="28" rx="5.2" ry="6.5" fill="#24334a" />
        <path d="M13 10c2.2-1.5 4.6-1.7 7.1-.4M22 9.6c2.5-1.3 4.9-1.1 7.1.4" stroke="#7b4d00" strokeLinecap="round" strokeWidth="2" />
        <path d="M12 9c5-3.1 13-3.5 18.2.2" stroke="#fff" strokeLinecap="round" strokeWidth="2" opacity="0.46" />
      </svg>
    );
  }

  if (type === "heart-eyes") {
    return (
      <svg className="reaction-svg reaction-heart-eyes" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="17" fill="#ffca55" stroke="#a76700" strokeWidth="2" />
        <path d="M13 12.7c-2.2 0-3.9 1.7-3.9 3.8 0 4.1 6.7 7.4 6.9 7.5.2-.1 6.9-3.4 6.9-7.5 0-2.1-1.7-3.8-3.9-3.8-1.3 0-2.4.6-3 1.6-.6-1-1.7-1.6-3-1.6z" fill="#ff4f8c" stroke="#a81e51" strokeWidth="1.4" />
        <path d="M26 12.7c-2.2 0-3.9 1.7-3.9 3.8 0 4.1 6.7 7.4 6.9 7.5.2-.1 6.9-3.4 6.9-7.5 0-2.1-1.7-3.8-3.9-3.8-1.3 0-2.4.6-3 1.6-.6-1-1.7-1.6-3-1.6z" fill="#ff4f8c" stroke="#a81e51" strokeWidth="1.4" />
        <path d="M13.5 28.2c3.4 4.5 11.5 4.5 15 0" stroke="#743c00" strokeLinecap="round" strokeWidth="2.6" />
      </svg>
    );
  }

  if (type === "laugh-cry") {
    return (
      <svg className="reaction-svg reaction-laugh-cry" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="17" fill="#ffd45f" stroke="#a76700" strokeWidth="2" />
        <path d="M12.5 18.2c1.7-2 4.1-2 5.8 0M23.7 18.2c1.7-2 4.1-2 5.8 0" stroke="#24334a" strokeLinecap="round" strokeWidth="2.4" />
        <path d="M13.4 24.5c2.4 7.8 12.8 7.8 15.2 0z" fill="#24334a" />
        <path d="M15.7 27.8c3 2.4 7.5 2.4 10.5 0" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" opacity="0.82" />
        <path d="M8.2 23.3c-3.2 2.8-3.4 7.1-.6 8.5 2.6 1.3 5.7-.9 5.8-5.4zM33.8 23.3c3.2 2.8 3.4 7.1.6 8.5-2.6 1.3-5.7-.9-5.8-5.4z" fill="#65c7ff" stroke="#237abd" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg className="reaction-svg reaction-hundred" viewBox="0 0 56 42" aria-hidden="true">
      <rect x="3" y="7" width="50" height="28" rx="10" fill="#ff5f57" stroke="#9d211c" strokeWidth="2" />
      <path d="M9 13h38" stroke="#fff" strokeLinecap="round" strokeWidth="2" opacity="0.48" />
      <text x="28" y="27" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff" fontFamily="Verdana, sans-serif">
        100!
      </text>
    </svg>
  );
}

export default function WallsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [comments, setComments] = useState<WallComment[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [viewProfileId, setViewProfileId] = useState("");
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateFish, setShowCreateFish] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newFishOpen, setNewFishOpen] = useState(false);
  const [fishType, setFishType] = useState<"text" | "image" | "song">("text");
  const [postMode, setPostMode] = useState<"pin" | "collab">("pin");
  const [showFishPage, setShowFishPage] = useState(true);
  const [playerCollapsed, setPlayerCollapsed] = useState(false);
  const [followPulse, setFollowPulse] = useState(false);
  const [showOlderPosts, setShowOlderPosts] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"all" | "follows" | "comments" | "reactions" | "collabs">("all");
  const [seenNotifications, setSeenNotifications] = useState(0);
  const [highlightUnreadCount, setHighlightUnreadCount] = useState(0);
  const [showOlderNotifications, setShowOlderNotifications] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const [loginHandle, setLoginHandle] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioStarted, setRadioStarted] = useState(false);
  const [postFontStyle, setPostFontStyle] = useState("lucida");
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingRadioStartRef = useRef(false);
  const pendingDirectStartRef = useRef(false);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;
  const viewProfile =
    profiles.find((profile) => profile.id === viewProfileId) || activeProfile || profiles.find(Boolean) || null;
  const wallPosts = useMemo(
    () =>
      viewProfile
        ? posts
            .filter(
              (post) =>
                post.targetId === viewProfile.id || post.authorId === viewProfile.id || post.collaboratorId === viewProfile.id
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [posts, viewProfile]
  );
  const visibleWallPosts = showOlderPosts ? wallPosts : wallPosts.slice(0, 5);
  const olderPostCount = Math.max(0, wallPosts.length - 5);
  const fishPagePosts = useMemo(
    () =>
      posts
        .filter((post) => post.authorId !== activeProfile?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 24),
    [activeProfile, posts]
  );
  const commentsByPost = useMemo(() => {
    return comments.filter((comment) => !comment.text.startsWith(reactionPrefix)).reduce<Record<string, WallComment[]>>((groups, comment) => {
      groups[comment.postId] = [...(groups[comment.postId] || []), comment];
      return groups;
    }, {});
  }, [comments]);
  const reactionCommentsByPost = useMemo(() => {
    return comments.filter((comment) => comment.text.startsWith(reactionPrefix)).reduce<Record<string, WallComment[]>>((groups, comment) => {
      groups[comment.postId] = [...(groups[comment.postId] || []), comment];
      return groups;
    }, {});
  }, [comments]);
  const notifications = useMemo(() => {
    if (!activeProfile) return [];

    const followNotes = follows
      .filter((follow) => follow.followingId === activeProfile.id)
      .map((follow) => {
        const follower = profiles.find((profile) => profile.id === follow.followerId);
        return {
          id: `follow-${follow.followerId}`,
          category: "follows",
          text: `${follower?.name || "Jemand"} folgt dir jetzt.`,
          profileId: follow.followerId,
          postId: "",
          createdAt: follow.createdAt
        };
      });
    const collabNotes = posts
      .filter((post) => post.collaboratorId === activeProfile.id && post.authorId !== activeProfile.id)
      .map((post) => {
        const author = profiles.find((profile) => profile.id === post.authorId);
        return {
          id: `collab-${post.id}`,
          category: "collabs",
          text: `${author?.name || "Jemand"} hat dich in einem .fish markiert.`,
          profileId: post.targetId || post.authorId,
          postId: post.id,
          createdAt: post.createdAt
        };
      });
    const commentNotes = comments
      .filter((comment) => {
        const post = posts.find((item) => item.id === comment.postId);
        return post?.authorId === activeProfile.id && comment.authorId !== activeProfile.id && !comment.text.startsWith(reactionPrefix);
      })
      .map((comment) => {
        const author = profiles.find((profile) => profile.id === comment.authorId);
        const post = posts.find((item) => item.id === comment.postId);
        return {
          id: `comment-${comment.id}`,
          category: "comments",
          text: `${author?.name || "Jemand"} hat dein .fish kommentiert.`,
          profileId: post?.targetId || post?.authorId || comment.authorId,
          postId: comment.postId,
          createdAt: comment.createdAt
        };
      });
    const reactionNotes = comments
      .filter((comment) => {
        const post = posts.find((item) => item.id === comment.postId);
        return post?.authorId === activeProfile.id && comment.authorId !== activeProfile.id && comment.text.startsWith(reactionPrefix);
      })
      .map((comment) => {
        const author = profiles.find((profile) => profile.id === comment.authorId);
        const post = posts.find((item) => item.id === comment.postId);
        const reaction = reactionOptions.find((option) => `${reactionPrefix}${option.key}` === comment.text);
        return {
          id: `reaction-${comment.id}`,
          category: "reactions",
          text: `${author?.name || "Jemand"} hat mit ${reaction?.label || "einer Reaktion"} reagiert.`,
          profileId: post?.targetId || post?.authorId || comment.authorId,
          postId: comment.postId,
          createdAt: comment.createdAt
        };
      });

    return [...reactionNotes, ...commentNotes, ...collabNotes, ...followNotes].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [activeProfile, comments, follows, posts, profiles]);
  const visibleNotifications = useMemo(() => {
    if (notificationTab === "all") return notifications;
    return notifications.filter((note) => note.category === notificationTab);
  }, [notificationTab, notifications]);
  const displayedNotifications = showOlderNotifications ? visibleNotifications : visibleNotifications.slice(0, 5);
  const olderNotificationCount = Math.max(0, visibleNotifications.length - 5);
  const mutualFriends = useMemo(() => {
    if (!viewProfile) return [];

    return profiles.filter((profile) => {
      if (profile.id === viewProfile.id) return false;
      const followsThem = follows.some(
        (follow) => follow.followerId === viewProfile.id && follow.followingId === profile.id
      );
      const followsBack = follows.some(
        (follow) => follow.followerId === profile.id && follow.followingId === viewProfile.id
      );
      return followsThem && followsBack;
    });
  }, [follows, profiles, viewProfile]);
  const isFollowingViewProfile =
    Boolean(activeProfile && viewProfile) &&
    follows.some((follow) => follow.followerId === activeProfile?.id && follow.followingId === viewProfile?.id);
  const activeMutualFriends = useMemo(() => {
    if (!activeProfile) return [];

    return profiles.filter((profile) => {
      if (profile.id === activeProfile.id) return false;
      const followsThem = follows.some(
        (follow) => follow.followerId === activeProfile.id && follow.followingId === profile.id
      );
      const followsBack = follows.some(
        (follow) => follow.followerId === profile.id && follow.followingId === activeProfile.id
      );
      return followsThem && followsBack;
    });
  }, [activeProfile, follows, profiles]);
  const canCollabWithViewProfile =
    Boolean(activeProfile && viewProfile) &&
    (activeProfile?.id === viewProfile?.id ||
      activeMutualFriends.some((profile) => profile.id === viewProfile?.id));
  const hasCollabTarget =
    Boolean(activeProfile && viewProfile) &&
    (activeProfile?.id === viewProfile?.id ? activeMutualFriends.length > 0 : canCollabWithViewProfile);
  const visibleProfiles = useMemo(() => {
    const search = profileSearch.trim().toLowerCase();
    if (!search) return profiles;

    return profiles.filter((profile) =>
      [profile.name, profile.handle, profile.headline].some((value) => value.toLowerCase().includes(search))
    );
  }, [profileSearch, profiles]);
  const editableProfile = viewProfile && (isAdmin || activeProfile?.id === viewProfile.id) ? viewProfile : null;

  function notify(message: string) {
    setStatus(message);
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    loadWalls();
  }, []);

  useEffect(() => {
    if (!activeProfileId) return;

    const interval = window.setInterval(() => {
      loadWalls(false);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeProfileId]);

  useEffect(() => {
    setShowOlderPosts(false);
  }, [viewProfileId]);

  useEffect(() => {
    if (postMode === "collab" && !hasCollabTarget) {
      setPostMode("pin");
    }
  }, [hasCollabTarget, postMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (pendingRadioStartRef.current || pendingDirectStartRef.current || radioStarted) {
      const shouldJumpIntoSong = pendingRadioStartRef.current;
      pendingRadioStartRef.current = false;
      pendingDirectStartRef.current = false;
      playSelectedTrack(shouldJumpIntoSong);
    }
  }, [activeTrack]);

  async function loadWalls(showSpinner = true) {
    if (showSpinner) setLoading(true);

    try {
      const [profilesResponse, postsResponse] = await Promise.all([
        fetch("/api/walls/profiles", { cache: "no-store" }),
        fetch("/api/walls/posts", { cache: "no-store" })
      ]);
      const commentsResponse = await fetch("/api/walls/comments", { cache: "no-store" });
      const profilesData = await profilesResponse.json();
      const postsData = await postsResponse.json();
      const commentsData = await commentsResponse.json();
      const nextProfiles = profilesData.profiles || [];
      const nextActiveProfileId = profilesData.activeProfileId || "";

      setProfiles(nextProfiles);
      setFollows(profilesData.follows || []);
      setPosts(postsData.posts || []);
      setComments(commentsData.comments || []);
      setActiveProfileId(nextActiveProfileId);
      setViewProfileId((currentId) => {
        if (currentId && nextProfiles.some((profile: Profile) => profile.id === currentId)) return currentId;
        return nextActiveProfileId || "";
      });

      if (!profilesResponse.ok || !postsResponse.ok) {
        notify(profilesData.message || postsData.message || ".fish Profile konnten nicht geladen werden.");
      }
    } catch {
      notify(".fish Profile konnten nicht geladen werden.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function uploadFiles(files: File[], mode: "profile" | "pin" = "profile") {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("mode", mode);

    const response = await fetch("/api/walls/upload", {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload fehlgeschlagen.");
    }

    return data as { urls: string[]; profile?: Profile; message?: string };
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    notify("Login wird geprüft...");

    const response = await fetch("/api/walls/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: normalizeHandle(loginHandle), password: loginPassword })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Login stimmt nicht.");
      return;
    }

    setLoginHandle("");
    setLoginPassword("");
    setShowFishPage(true);
    notify("Eingeloggt. Willkommen zurück auf .fish.");
    await loadWalls();
  }

  async function logout() {
    await fetch("/api/walls/login", { method: "DELETE" });
    setActiveProfileId("");
    setViewProfileId("");
    setSideMenuOpen(false);
    notify("Ausgeloggt.");
    await loadWalls();
  }

  async function adminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    notify("Admin-Modus ist aus.");
  }

  async function adminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    notify("Admin-Zugang wird geprüft...");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword })
    });
    const data = await response.json().catch(() => ({ message: "" }));

    if (!response.ok) {
      notify(data.message || "Admin-Passwort stimmt nicht.");
      return;
    }

    setIsAdmin(true);
    setAdminPassword("");
    notify("Admin aktiv. Du kannst geöffnete .fish Profile bearbeiten.");
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("avatar");
    const name = String(formData.get("name") || "").trim();
    const handle = normalizeHandle(String(formData.get("handle") || name));
    const password = String(formData.get("password") || "");
    const selectedTheme = themeOptions.find((theme) => theme.value === String(formData.get("theme"))) || themeOptions[0];

    if (!name || !handle || !password) {
      notify("Bitte Name, Nutzername und Passwort eintragen.");
      return;
    }

    notify(".fish wird erstellt...");

    let avatar = "";

    try {
      if (file instanceof File && file.size) {
        const upload = await uploadFiles([file], "pin");
        avatar = upload.urls[0] || "";
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Profilbild konnte nicht hochgeladen werden.");
      return;
    }

    const profile: Profile = {
      id: createId(),
      name,
      handle,
      avatar,
      bio: String(formData.get("bio") || "Noch keine Bio, aber bestimmt ein starker Feed."),
      mood: String(formData.get("mood") || "online"),
      song: String(formData.get("song") || "Karaoke Song offen"),
      theme: selectedTheme.value,
      pattern: String(formData.get("pattern") || "aqua"),
      stickerPack: "party",
      headline: String(formData.get("headline") || `${name}s .fish`),
      glitter: formData.get("glitter") === "on",
      backgroundColor: String(formData.get("backgroundColor") || selectedTheme.background),
      accentColor: String(formData.get("accentColor") || selectedTheme.accent),
      fontStyle: String(formData.get("fontStyle") || "lucida"),
      layoutDensity: String(formData.get("layoutDensity") || "cozy"),
      verified: false,
      photos: []
    };

    const response = await fetch("/api/walls/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, password })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish konnte nicht gespeichert werden.");
      return;
    }

    notify(".fish erstellt und eingeloggt.");
    form.reset();
    setShowCreateFish(false);
    setShowFishPage(true);
    await loadWalls();
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    notify("Bild(er) werden hochgeladen...");

    try {
      const data = await uploadFiles(files);
      notify(data.message || "Bild(er) auf deine .fish gelegt.");
      event.target.value = "";
      await loadWalls(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function saveStyle(event: FormEvent<HTMLFormElement>) {
    if (!editableProfile) return;

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    notify(".fish Style wird gespeichert...");

    const payload = {
      profileId: isAdmin ? editableProfile.id : undefined,
      headline: String(formData.get("headline") || editableProfile.headline),
      bio: String(formData.get("bio") || editableProfile.bio),
      mood: String(formData.get("mood") || editableProfile.mood),
      song: String(formData.get("song") || editableProfile.song),
      theme: String(formData.get("theme") || editableProfile.theme),
      pattern: String(formData.get("pattern") || editableProfile.pattern),
      backgroundColor: String(formData.get("backgroundColor") || editableProfile.backgroundColor),
      accentColor: String(formData.get("accentColor") || editableProfile.accentColor),
      fontStyle: String(formData.get("fontStyle") || editableProfile.fontStyle),
      layoutDensity: String(formData.get("layoutDensity") || editableProfile.layoutDensity),
      verified: isAdmin ? formData.get("verified") === "on" : editableProfile.verified,
      glitter: formData.get("glitter") === "on",
      password: isAdmin ? String(formData.get("newPassword") || "").trim() : ""
    };

    const response = await fetch("/api/walls/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish Style konnte nicht gespeichert werden.");
      return;
    }

    notify(".fish Style gespeichert.");
    setEditProfileOpen(false);
    await loadWalls(false);
  }

  async function createPost(payload: Partial<WallPost>, mode: "pin" | "collab" = postMode, collaboratorId = "") {
    if (!viewProfile || !activeProfile) return false;

    const isOtherProfile = viewProfile.id !== activeProfile.id;
    const isAllowedCollab =
      mode !== "collab" ||
      (isOtherProfile
        ? activeMutualFriends.some((profile) => profile.id === viewProfile.id)
        : activeMutualFriends.some((profile) => profile.id === collaboratorId));

    if (!isAllowedCollab) {
      notify("Collab-.fish geht nur mit Top-Freunden.");
      return false;
    }

    const adminAuthorId = isAdmin ? String((document.querySelector("[name='adminAuthorId']") as HTMLSelectElement | null)?.value || "") : "";
    const adminCreatedAt = isAdmin ? String((document.querySelector("[name='adminCreatedAt']") as HTMLInputElement | null)?.value || "") : "";
    const targetId = adminAuthorId || activeProfile.id;
    const nextCollaboratorId =
      mode === "collab" ? collaboratorId || (isOtherProfile ? viewProfile.id : "") : "";

    const response = await fetch("/api/walls/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId,
        ...payload,
        collaboratorId: nextCollaboratorId,
        authorId: adminAuthorId,
        createdAt: adminCreatedAt
      })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish konnte nicht gespeichert werden.");
      return false;
    }

    await loadWalls(false);
    return true;
  }

  async function pinText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();
    const collaboratorId = String(formData.get("collaboratorId") || "");
    const fontStyle = String(formData.get("postFontStyle") || "lucida");

    if (!text) return;

    notify(".fish wird gespeichert...");
    const saved = await createPost(
      {
        postType: "text",
        text,
        sticker: `font:${fontStyle}|${postMode === "collab" ? "Collab .fish" : "Text .fish"}`,
        color: String(formData.get("color") || "#ffffff")
      } as WallPost,
      postMode,
      collaboratorId
    );
    if (saved) {
      notify("Text-.fish ist im Feed.");
      form.reset();
      setNewFishOpen(false);
    }
  }

  async function pinImage(event: FormEvent<HTMLFormElement>) {
    if (!viewProfile || !activeProfile) return;

    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image");
    const text = String(formData.get("text") || "").trim();
    const collaboratorId = String(formData.get("collaboratorId") || "");
    const fontStyle = String(formData.get("postFontStyle") || "lucida");

    if (!(file instanceof File) || !file.size) {
      notify("Bitte ein Bild auswählen.");
      return;
    }

    notify("Bild-.fish wird hochgeladen...");

    try {
      const upload = await uploadFiles([file], "pin");
      const saved = await createPost(
        {
          postType: "image",
          text: text || "Bild-.fish",
          sticker: `font:${fontStyle}|${postMode === "collab" ? "Collab .fish" : "Bild .fish"}`,
          color: String(formData.get("color") || "#ffffff"),
          mediaUrl: upload.urls[0]
        } as WallPost,
        postMode,
        collaboratorId
      );
      if (saved) {
        notify("Bild-.fish ist im Feed.");
        form.reset();
        setNewFishOpen(false);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Bild-.fish konnte nicht gespeichert werden.");
    }
  }

  async function pinSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const track = tracks[Number(formData.get("track")) || 0];
    const collaboratorId = String(formData.get("collaboratorId") || "");
    const fontStyle = String(formData.get("postFontStyle") || "lucida");

    notify("Song wird als .fish gepinnt...");
    const saved = await createPost(
      {
        postType: "song",
        text: String(formData.get("text") || "Song aus der Party-Playlist"),
        sticker: `font:${fontStyle}|${postMode === "collab" ? "Collab Song" : "Song .fish"}`,
        color: String(formData.get("color") || "#eef6ff"),
        songTitle: track.title,
        songArtist: track.artist,
        songSrc: track.src
      } as WallPost,
      postMode,
      collaboratorId
    );
    if (saved) {
      notify("Song-.fish ist im Feed.");
      form.reset();
      setNewFishOpen(false);
    }
  }

  async function toggleFollow() {
    if (!activeProfile || !viewProfile || activeProfile.id === viewProfile.id) return;

    const response = await fetch("/api/walls/follows", {
      method: isFollowingViewProfile ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: viewProfile.id })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Folgen hat nicht geklappt.");
      return;
    }

    const nextFollow = data.follow || {
      followerId: activeProfile.id,
      followingId: viewProfile.id,
      createdAt: new Date().toISOString()
    };
    setFollows((currentFollows) =>
      isFollowingViewProfile
        ? currentFollows.filter(
            (follow) => !(follow.followerId === nextFollow.followerId && follow.followingId === nextFollow.followingId)
          )
        : currentFollows.some(
              (follow) => follow.followerId === nextFollow.followerId && follow.followingId === nextFollow.followingId
            )
          ? currentFollows
          : [...currentFollows, nextFollow]
    );
    setFollowPulse(true);
    window.setTimeout(() => setFollowPulse(false), 520);
    notify(isFollowingViewProfile ? "Nicht mehr gefolgt." : `${viewProfile.name} wird gefolgt.`);
    await loadWalls(false);
  }

  async function addComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("comment") || "").trim();

    if (!text) return;

    const response = await fetch("/api/walls/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, text })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Kommentar konnte nicht gespeichert werden.");
      return;
    }

    form.reset();
    notify("Kommentar gespeichert.");
    await loadWalls(false);
  }

  async function reactToPost(postId: string, reaction: string) {
    const post = posts.find((item) => item.id === postId);

    if (post?.authorId === activeProfile?.id) {
      notify("Auf eigene .fishs kannst du nicht reagieren.");
      return;
    }

    const response = await fetch("/api/walls/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, reaction })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Reaktion konnte nicht gespeichert werden.");
      return;
    }

    notify(data.removed ? "Reaktion entfernt." : "Reaktion gespeichert.");
    await loadWalls(false);
  }

  async function deleteProfile() {
    if (!isAdmin || !viewProfile || viewProfile.id === "kimon") return;
    const ok = window.confirm(`${viewProfile.name} wirklich loeschen?`);
    if (!ok) return;

    const response = await fetch("/api/walls/profiles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: viewProfile.id })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || "Profil konnte nicht geloescht werden.");
      return;
    }

    notify("Profil geloescht.");
    setEditProfileOpen(false);
    setViewProfileId(activeProfile?.id || "");
    await loadWalls(false);
  }

  async function deletePost(postId: string) {
    const response = await fetch("/api/walls/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId })
    });
    const data = await response.json();

    if (!response.ok) {
      notify(data.message || ".fish konnte nicht geloescht werden.");
      return;
    }

    notify(".fish geloescht.");
    await loadWalls(false);
  }

  function openProfile(profileId?: string) {
    if (!profileId) return;
    setViewProfileId(profileId);
    setShowFishPage(false);
    setSideMenuOpen(false);
  }

  function openFishPage() {
    setShowFishPage(true);
    setSideMenuOpen(false);
  }

  function openCreateFishFromFishPage() {
    if (activeProfile) {
      setViewProfileId(activeProfile.id);
    }
    setPostMode("pin");
    setNewFishOpen(true);
  }

  function renderCollabSelect() {
    if (!activeProfile || postMode !== "collab" || activeProfile.id !== viewProfile?.id) return null;

    const possibleCollaborators = activeMutualFriends;

    return (
      <label>
        Collab mit
        <select name="collaboratorId" defaultValue={possibleCollaborators[0]?.id || ""} required disabled={!possibleCollaborators.length}>
          {possibleCollaborators.map((profile) => (
            <option value={profile.id} key={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        {!possibleCollaborators.length && <small>Collabs gehen erst, wenn ihr gegenseitig folgt.</small>}
      </label>
    );
  }

  function renderPostOptions() {
    return (
      <div className="post-options-panel">
        <label>
          Schrift fuer diesen .fish
          <select
            name="postFontStyle"
            value={postFontStyle}
            onChange={(event) => setPostFontStyle(event.target.value)}
          >
            {fontOptions.map((font) => (
              <option value={font.value} key={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <div className={`font-preview-card font-${postFontStyle}`}>So sieht dein .fish Text aus.</div>
        {isAdmin && (
          <>
            <label>
              Als Profil posten
              <select name="adminAuthorId" defaultValue={activeProfile?.id || ""}>
                {profiles.map((profile) => (
                  <option value={profile.id} key={profile.id}>
                    {profile.name} (@{profile.handle})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Datum manipulieren
              <input name="adminCreatedAt" type="datetime-local" />
            </label>
          </>
        )}
      </div>
    );
  }

  function openNotification(note: { profileId: string; postId: string }) {
    openProfile(note.profileId);
    setNotificationsOpen(false);
    if (note.postId) {
      setHighlightedPostId(note.postId);
      window.setTimeout(() => {
        document.getElementById(`fish-post-${note.postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  }

  function toggleNotifications() {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      setHighlightUnreadCount(0);
      return;
    }

    setHighlightUnreadCount(Math.max(0, notifications.length - seenNotifications));
    setSeenNotifications(notifications.length);
    setShowOlderNotifications(false);
    setNotificationsOpen(true);
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
          setIsPlaying(!audio.muted);
          setRadioStarted(true);
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

  function toggleMusic(src?: string) {
    const audio = audioRef.current;
    if (!audio) return;

    if (src) {
      const trackIndex = tracks.findIndex((track) => track.src === src);
      if (trackIndex >= 0) {
        if (trackIndex === activeTrack) {
          playSelectedTrack(false);
          return;
        }

        pendingDirectStartRef.current = true;
        setActiveTrack(trackIndex);
        return;
      }
    }

    if (audio.paused) {
      startRadio();
      return;
    }

    audio.muted = !audio.muted;
    setIsPlaying(!audio.muted);
  }

  function nextTrack() {
    setActiveTrack((currentTrack) =>
      tracks.length > 1 ? (currentTrack + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length : 0
    );
  }

  const wallStyle =
    viewProfile &&
    ({
      "--wall-a": viewProfile.accentColor,
      "--wall-b": viewProfile.backgroundColor
    } as CSSProperties);

  function renderVerified(profile?: Profile | null) {
    if (!profile?.verified) return null;

    return (
      <span className="verified-badge" title="Diese Person ist verifiziert." aria-label="Diese Person ist verifiziert.">
        ✓
      </span>
    );
  }

  function renderProfileChip(profile?: Profile | null) {
    return (
      <button className="post-profile-chip" type="button" onClick={() => openProfile(profile?.id)}>
        <span className="post-mini-avatar">
          {profile?.avatar ? <img src={profile.avatar} alt="" /> : profile?.name?.[0] || "?"}
        </span>
        <span>
          {profile?.name || "Unbekannt"} {renderVerified(profile)}
        </span>
      </button>
    );
  }

  function renderPost(post: WallPost) {
    const author = profiles.find((profile) => profile.id === post.authorId);
    const target = profiles.find((profile) => profile.id === post.targetId);
    const collaborator = profiles.find((profile) => profile.id === post.collaboratorId);
    const postComments = commentsByPost[post.id] || [];
    const postReactions = reactionCommentsByPost[post.id] || [];
    const isOnOtherProfile = author && target && author.id !== target.id;
    const canDeletePost =
      Boolean(activeProfile) && (post.authorId === activeProfile?.id || post.targetId === activeProfile?.id);
    const activeReaction = postReactions.find((reaction) => reaction.authorId === activeProfile?.id)?.text.replace(reactionPrefix, "");
    const canReact = Boolean(activeProfile && post.authorId !== activeProfile.id);
    const stickerParts = post.sticker.startsWith("font:") ? post.sticker.split("|") : [];
    const postFont = stickerParts[0]?.replace("font:", "") || "lucida";
    const postLabel = stickerParts[1] || post.sticker;

    return (
      <article
        id={`fish-post-${post.id}`}
        className={`wall-post post-${post.postType} ${post.postType === "image" ? "image-wall-post" : ""} ${
          highlightedPostId === post.id ? "highlighted" : ""
        } font-${postFont}`}
        key={post.id}
        style={{ "--pin-color": post.color } as CSSProperties}
      >
        <div className="post-route">
          {renderProfileChip(author)}
          {collaborator ? (
            <>
              <span>mit</span>
              {renderProfileChip(collaborator)}
            </>
          ) : isOnOtherProfile ? (
            <>
              <span>an</span>
              {renderProfileChip(target)}
            </>
          ) : null}
        </div>
        {canDeletePost && (
          <button className="delete-post-button" type="button" onClick={() => deletePost(post.id)}>
            .fish loeschen
          </button>
        )}
        <strong>{postLabel}</strong>
        {post.postType === "image" && post.mediaUrl && (
          <figure className="post-image-frame">
            <img className="post-image" src={post.mediaUrl} alt={post.text || "Bild-.fish"} />
          </figure>
        )}
        {post.postType === "song" && (
          <div className="post-song">
            <b>
              {post.songTitle} - {post.songArtist}
            </b>
            <button onClick={() => toggleMusic(post.songSrc)}>Abspielen</button>
          </div>
        )}
        <p>{post.text}</p>
        <span>{new Date(post.createdAt).toLocaleString("de-DE")}</span>

        <div className="fish-reactions">
          {canReact && (
            <div className="reaction-buttons">
              {reactionOptions.map((reaction) => (
                <button
                  className={activeReaction === reaction.key ? "active" : ""}
                  type="button"
                  key={reaction.key}
                  onClick={() => reactToPost(post.id, reaction.key)}
                  title={reaction.label}
                >
                  <span>
                    <ReactionIcon type={reaction.key} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="reaction-summary">
            {reactionOptions.map((reaction) => {
              const actors = postReactions
                .filter((item) => item.text === `${reactionPrefix}${reaction.key}`)
                .map((item) => profiles.find((profile) => profile.id === item.authorId)?.name || "Unbekannt");

              if (!actors.length) return null;

              return (
                <p key={reaction.key}>
                  <b>
                    <ReactionIcon type={reaction.key} />
                  </b>{" "}
                  {actors.join(", ")}
                </p>
              );
            })}
          </div>
        </div>

        <div className="fish-comments">
          {postComments.map((comment) => {
            const commentAuthor = profiles.find((profile) => profile.id === comment.authorId);
            return (
              <div className="fish-comment" key={comment.id}>
                <button type="button" onClick={() => openProfile(commentAuthor?.id)}>
                  {commentAuthor?.name || "Unbekannt"} {renderVerified(commentAuthor)}
                </button>
                <span>{comment.text}</span>
              </div>
            );
          })}
          <form className="comment-form" onSubmit={(event) => addComment(event, post.id)}>
            <input name="comment" placeholder="Kommentieren..." />
            <button type="submit">Senden</button>
          </form>
        </div>
      </article>
    );
  }

  return (
    <main className="walls-page">
      <audio
        ref={audioRef}
        src={tracks[activeTrack].src}
        onEnded={nextTrack}
        onPlay={() => {
          setIsPlaying(!audioRef.current?.muted);
          setRadioStarted(true);
        }}
        onPause={() => setIsPlaying(false)}
      />
      <nav className="topbar fish-topbar" aria-label=".fish Navigation">
        <div>
          <button className="fish-orb-brand" type="button" onClick={openFishPage}>
            .fish
          </button>
          {activeProfile && (
            <button className="fish-home-profile" type="button" onClick={() => openProfile(activeProfile.id)}>
              <span className="mini-avatar">
                {activeProfile.avatar ? <img src={activeProfile.avatar} alt="" /> : activeProfile.name[0]}
              </span>
              <span>
                <small>Mein Profil</small>
                <b>{activeProfile.name}</b>
              </span>
            </button>
          )}
          {activeProfile && (
            <button className="fish-topbar-create" type="button" onClick={openCreateFishFromFishPage}>
              + .fish erstellen
            </button>
          )}
        </div>
      </nav>

      {!activeProfile && (
        <section className="section walls-hero">
          <div className="snow-window">
            <div className="window-lights" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="eyebrow">.fish</p>
            <h1>.fish</h1>
            <p className="hero-copy">
              Retro-Profile, Fotos, Playlist-Songs und echte gegenseitige Freundschaften. Erst einloggen oder
              registrieren, dann öffnet sich dein Bereich.
            </p>
          </div>
        </section>
      )}

      {!activeProfile && (
        <section className="section walls-auth">
          <div className="snow-window">
            <form className="form wall-auth-form" onSubmit={login}>
              <p className="eyebrow">.fish Account</p>
              <h2>Einloggen</h2>
              <label>
                Nutzername
                <input
                  value={loginHandle}
                  onChange={(event) => setLoginHandle(event.target.value)}
                  placeholder="dein Nutzername"
                  required
                />
              </label>
              <label>
                Passwort
                <input
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  type="password"
                  placeholder="dein Passwort"
                  required
                />
              </label>
              <button className="aqua-button">Einloggen</button>
            </form>

            <div className="fish-create-panel">
              <button
                className="secondary-button fish-create-toggle"
                type="button"
                onClick={() => setShowCreateFish((value) => !value)}
              >
                {showCreateFish ? ".fish erstellen schließen" : "Neues .fish erstellen"}
              </button>

              {showCreateFish && (
                <form className="form wall-auth-form fish-register-panel" onSubmit={createProfile}>
                  <p className="eyebrow">Neu auf .fish</p>
                  <h2>.fish erstellen</h2>
                  <label>
                    Name
                    <input name="name" required placeholder="Dein Name" />
                  </label>
                  <label>
                    Nutzername
                    <input name="handle" required placeholder="z. B. louki2003" />
                  </label>
                  <label>
                    Passwort
                    <input name="password" type="password" required placeholder="Nicht dein wichtiges Passwort nutzen" />
                  </label>
                  <label>
                    Profilbild
                    <input name="avatar" type="file" accept="image/*" />
                  </label>
                  <label>
                    Überschrift
                    <input name="headline" placeholder="z. B. Loukis .fish" />
                  </label>
                  <label>
                    Bio
                    <textarea name="bio" placeholder="Was soll auf deiner .fish stehen?" />
                  </label>
                  <label>
                    Farbe
                    <select name="theme" defaultValue="blue">
                      {themeOptions.map((theme) => (
                        <option value={theme.value} key={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hintergrundfarbe
                    <input name="backgroundColor" type="color" defaultValue="#dcecff" />
                  </label>
                  <label>
                    Akzentfarbe
                    <input name="accentColor" type="color" defaultValue="#66b9f1" />
                  </label>
                  <label>
                    Muster
                    <select name="pattern" defaultValue="aqua">
                      {patternOptions.map((pattern) => (
                        <option value={pattern.value} key={pattern.value}>
                          {pattern.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Schrift
                    <select name="fontStyle" defaultValue="lucida">
                      {fontOptions.map((font) => (
                        <option value={font.value} key={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="font-preview-card font-lucida">Vorschau: Willkommen auf meinem .fish.</div>
                  <label className="check-label">
                    <input name="glitter" type="checkbox" defaultChecked />
                    Glitzer-Modus aktivieren
                  </label>
                  <button className="aqua-button">.fish erstellen</button>
                </form>
              )}
            </div>
            {loading && <p>.fish Profile werden geladen...</p>}
          </div>
        </section>
      )}

      {activeProfile && viewProfile && (
        <>
          <aside className={`wall-music-player ${playerCollapsed ? "collapsed" : ""}`}>
            <button
              className="player-collapse"
              type="button"
              onClick={() => setPlayerCollapsed((value) => !value)}
              aria-label={playerCollapsed ? "Player ausklappen" : "Player einklappen"}
            >
              {playerCollapsed ? "▲" : "▼"}
            </button>
            {!playerCollapsed && (
              <>
                <strong>.fish Player</strong>
                <span>
                  {radioStarted ? `103.7 .fish FM · ${tracks[activeTrack].title}` : "103.7 .fish FM · Radio bereit"}
                </span>
                <div className="ipod-controls-mini">
                  <button className="mini-play" onClick={() => toggleMusic()}>
                    {isPlaying ? "Ⅱ" : "▶"}
                  </button>
                </div>
              </>
            )}
          </aside>

          <button className="fish-dock-toggle" type="button" onClick={() => setSideMenuOpen((value) => !value)}>
            {sideMenuOpen ? "Menu schliessen" : ".fish Menu"}
          </button>

          <button className="fish-bell" type="button" onClick={toggleNotifications} aria-label="Benachrichtigungen">
            bell
            {Math.max(0, notifications.length - seenNotifications) > 0 && (
              <span>{Math.max(0, notifications.length - seenNotifications)}</span>
            )}
          </button>

          {notificationsOpen && (
            <aside className="fish-notification-popover">
              <div className="notification-head">
                <strong>Benachrichtigungen</strong>
                <span>{visibleNotifications.length} Einträge</span>
              </div>
              <div className="notification-tabs">
                {[
                  ["all", "Alle"],
                  ["follows", "Follows"],
                  ["comments", "Kommentare"],
                  ["reactions", "Reactions"],
                  ["collabs", "Collabs"]
                ].map(([key, label]) => (
                  <button
                    className={notificationTab === key ? "active" : ""}
                    type="button"
                    key={key}
                    onClick={() => {
                      setNotificationTab(key as typeof notificationTab);
                      setShowOlderNotifications(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {visibleNotifications.length ? (
                <>
                  {displayedNotifications.map((note, index) => (
                    <button
                      className={index < highlightUnreadCount ? "notification-unread" : ""}
                      type="button"
                      key={note.id}
                      onClick={() => openNotification(note)}
                    >
                      <strong>{note.text}</strong>
                      <small>{relativeTimeLabel(note.createdAt)}</small>
                    </button>
                  ))}
                  {olderNotificationCount > 0 && (
                    <button
                      className="notification-more-button"
                      type="button"
                      onClick={() => setShowOlderNotifications((value) => !value)}
                    >
                      {showOlderNotifications
                        ? "Ältere einklappen"
                        : `${olderNotificationCount} ältere anzeigen`}
                    </button>
                  )}
                </>
              ) : (
                <span>Noch nichts Neues.</span>
              )}
            </aside>
          )}

          <aside className={`fish-side-dock ${sideMenuOpen ? "open" : ""}`}>
            <p className="eyebrow">.fish Menu</p>
            <div className="wall-profile-list">
              <button className={!showFishPage && viewProfile.id === activeProfile.id ? "active" : ""} type="button" onClick={() => openProfile(activeProfile.id)}>
                <span className="mini-avatar">
                  {activeProfile.avatar ? <img src={activeProfile.avatar} alt="" /> : activeProfile.name[0]}
                </span>
                <span>Mein .fish</span>
              </button>
            </div>
            <button className={`menu-nav-button ${showFishPage ? "active" : ""}`} type="button" onClick={openFishPage}>
              .fishpage
            </button>
            <label className="fish-menu-search">
              Suche
              <input
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder=".fish suchen"
              />
            </label>
            <div className="fish-menu-results">
              {visibleProfiles.map((profile) => (
                <button
                  className={profile.id === viewProfile.id && !showFishPage ? "active" : ""}
                  key={profile.id}
                  onClick={() => openProfile(profile.id)}
                  type="button"
                >
                  <span className="mini-avatar">
                    {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name[0]}
                  </span>
                  <span>{profile.name} {renderVerified(profile)}</span>
                </button>
              ))}
              {!visibleProfiles.length && <span>Kein .fish gefunden.</span>}
            </div>
            {isAdmin ? (
              <div className="fish-admin-box admin-on">
                <strong>Admin aktiv</strong>
                <span>Du bearbeitest das geöffnete .fish.</span>
                <button className="secondary-button" type="button" onClick={adminLogout}>
                  Admin aus
                </button>
              </div>
            ) : (
              <form className="fish-admin-box" onSubmit={adminLogin}>
                <label>
                  Admin
                  <input
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    type="password"
                    placeholder="Admin-Passwort"
                  />
                </label>
                <button className="secondary-button">Admin Login</button>
              </form>
            )}
            <button className="secondary-button" type="button" onClick={logout}>
              Ausloggen
            </button>
          </aside>

          <section
            id="wall"
            className={`section wall-stage theme-${viewProfile.theme} pattern-${viewProfile.pattern} font-${viewProfile.fontStyle} density-${viewProfile.layoutDensity} ${
              viewProfile.glitter ? "glitter-on" : ""
            }`}
            style={wallStyle || undefined}
          >
            {showFishPage ? (
              <article className="myspace-card fishpage-card">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>.fishpage</strong>
                </div>
                <div className="fishpage-body">
                  <div>
                    <p className="eyebrow">Neueste .fishs</p>
                    <h2>.fishpage</h2>
                  </div>
                  <button className="aqua-button fishpage-create-button" type="button" onClick={openCreateFishFromFishPage}>
                    .fish erstellen
                  </button>
                  <article className="wall-post party-news-post">
                    <div className="post-route">
                      {renderProfileChip(profiles.find((profile) => profile.id === "kimon"))}
                      <span>posted</span>
                    </div>
                    <div className="pinned-ribbon">pinned</div>
                    <strong>Kimons Party Website</strong>
                    <div className="party-news-balloons" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="party-news-confetti" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <p>
                      Kimon's 23. Geburtstag steht hier fest im Feed: 27.06.2026, 19:00, Wendelinstraße 94.
                      Dresscode schick, aber entspannt.
                    </p>
                    <a className="secondary-button party-news-link" href="/party">
                      Party-Website öffnen
                    </a>
                  </article>
                  <div className="wall-posts">
                    {fishPagePosts.length ? fishPagePosts.map((post) => renderPost(post)) : <p>Noch keine fremden .fishs da.</p>}
                  </div>
                </div>
              </article>
            ) : (
            <article className="myspace-card">
              <div className="myspace-topbar">
                <span />
                <span />
                <span />
                <strong>{viewProfile.headline || `${viewProfile.name}s .fish`}</strong>
              </div>

              <div className="profile-grid">
                <div className="profile-sidebar">
                  <div className="profile-avatar">
                    {viewProfile.avatar ? <img src={viewProfile.avatar} alt={viewProfile.name} /> : viewProfile.name[0]}
                  </div>
                  <h2>{viewProfile.name}</h2>
                  <p>
                    @{viewProfile.handle} {renderVerified(viewProfile)}
                  </p>
                  {editableProfile && (
                    <button className="secondary-button profile-edit-button" onClick={() => setEditProfileOpen(true)}>
                      Profil bearbeiten
                    </button>
                  )}
                  {activeProfile.id !== viewProfile.id && (
                    <button className={`aqua-button follow-button ${followPulse ? "pulse" : ""}`} onClick={toggleFollow}>
                      {isFollowingViewProfile ? "Gefolgt" : "Folgen"}
                    </button>
                  )}
                </div>

                <div className="profile-main">
                  <section className="wall-box">
                    <h3>Über mich</h3>
                    <p>{viewProfile.bio}</p>
                  </section>

                  <section className="wall-box">
                    <h3>Top Freunde</h3>
                    <div className="top-friends">
                      {mutualFriends.length ? (
                        mutualFriends.map((friend) => (
                          <button key={friend.id} onClick={() => openProfile(friend.id)}>
                            <span className="mini-avatar">
                              {friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name[0]}
                            </span>
                            <span>{friend.name} {renderVerified(friend)}</span>
                          </button>
                        ))
                      ) : (
                        <p>Top Freunde erscheinen erst, wenn beide Profile sich gegenseitig folgen.</p>
                      )}
                    </div>
                  </section>

                  <section className="wall-box">
                    <div className="feed-heading">
                      <h3>Feed</h3>
                      <button className="aqua-button compact-button" onClick={() => setNewFishOpen(true)}>
                        Neues .fish
                      </button>
                    </div>
                    <div className="wall-posts">
                      {visibleWallPosts.length ? (
                        visibleWallPosts.map((post) => renderPost(post))
                      ) : (
                        <p>Noch nichts im Feed. Sei die erste Person.</p>
                      )}
                      {olderPostCount > 0 && (
                        <button className="older-posts-toggle" type="button" onClick={() => setShowOlderPosts((value) => !value)}>
                          {showOlderPosts ? "Ältere .fishs einklappen" : `${olderPostCount} ältere .fishs anzeigen`}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </article>
            )}
          </section>

          {newFishOpen && (
            <div className="fish-modal-backdrop" role="dialog" aria-modal="true">
              <div className="fish-modal snow-window">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>Neues .fish</strong>
                </div>
                <div className="fish-modal-body">
                  <div className="fish-type-tabs">
                    <button className={fishType === "text" ? "active" : ""} type="button" onClick={() => setFishType("text")}>
                      Text
                    </button>
                    <button className={fishType === "image" ? "active" : ""} type="button" onClick={() => setFishType("image")}>
                      Bild
                    </button>
                    <button className={fishType === "song" ? "active" : ""} type="button" onClick={() => setFishType("song")}>
                      Song
                    </button>
                  </div>
                  <div className="fish-mode-tabs">
                    <button
                      className={postMode === "pin" ? "active" : ""}
                      type="button"
                      onClick={() => setPostMode("pin")}
                    >
                      Eigener Feed
                    </button>
                    <button
                      className={postMode === "collab" ? "active" : ""}
                      type="button"
                      disabled={!hasCollabTarget}
                      onClick={() => setPostMode("collab")}
                    >
                      Collab-.fish
                    </button>
                  </div>
                  <p className="fish-mode-help">
                    Eigener Feed heißt: du postest auf deinem Profil. Collab heißt: ein gemeinsames .fish mit Top-Freunden.
                  </p>

                  {fishType === "text" && (
                    <form className="pin-form" onSubmit={pinText}>
                      {renderCollabSelect()}
                      {renderPostOptions()}
                      <label>
                        Text-.fish
                        <textarea name="text" placeholder="Schreib etwas in deinen Feed" required />
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#ffffff" />
                      </label>
                      <button className="aqua-button">Text-.fish posten</button>
                    </form>
                  )}

                  {fishType === "image" && (
                    <form className="pin-form" onSubmit={pinImage}>
                      {renderCollabSelect()}
                      {renderPostOptions()}
                      <label>
                        Bild-.fish
                        <input name="image" type="file" accept="image/*" required />
                      </label>
                      <label>
                        Caption
                        <input name="text" placeholder="Kurzer Text zum Bild" />
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#fff8dc" />
                      </label>
                      <button className="aqua-button">Bild-.fish posten</button>
                    </form>
                  )}

                  {fishType === "song" && (
                    <form className="pin-form" onSubmit={pinSong}>
                      {renderCollabSelect()}
                      {renderPostOptions()}
                      <label>
                        Song-.fish
                        <select name="track" defaultValue="0">
                          {tracks.map((track, index) => (
                            <option value={index} key={track.src}>
                              {track.title} - {track.artist}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Kommentar
                        <input name="text" placeholder="Warum dieser Song?" />
                      </label>
                      <label>
                        Farbe
                        <input name="color" type="color" defaultValue="#eef6ff" />
                      </label>
                      <button className="aqua-button">Song-.fish posten</button>
                    </form>
                  )}

                  <button className="secondary-button modal-close" type="button" onClick={() => setNewFishOpen(false)}>
                    Schliessen
                  </button>
                </div>
              </div>
            </div>
          )}

          {editProfileOpen && editableProfile && (
            <div className="fish-modal-backdrop" role="dialog" aria-modal="true">
              <div className="fish-modal fish-modal-wide snow-window">
                <div className="myspace-topbar">
                  <span />
                  <span />
                  <span />
                  <strong>
                    {isAdmin && editableProfile.id !== activeProfile.id ? "Admin: .fish bearbeiten" : "Profil bearbeiten"}
                  </strong>
                </div>
                <div className="fish-modal-body">
                  <form className="pin-form profile-edit-grid" onSubmit={saveStyle}>
                    <label>
                      Überschrift
                      <input name="headline" defaultValue={editableProfile.headline} />
                    </label>
                    <label>
                      Bio
                      <textarea name="bio" defaultValue={editableProfile.bio} />
                    </label>
                    <label>
                      Theme
                      <select name="theme" defaultValue={editableProfile.theme}>
                        {themeOptions.map((theme) => (
                          <option value={theme.value} key={theme.value}>
                            {theme.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Hintergrund
                      <input name="backgroundColor" type="color" defaultValue={editableProfile.backgroundColor} />
                    </label>
                    <label>
                      Akzent
                      <input name="accentColor" type="color" defaultValue={editableProfile.accentColor} />
                    </label>
                    <label>
                      Muster
                      <select name="pattern" defaultValue={editableProfile.pattern}>
                        {patternOptions.map((pattern) => (
                          <option value={pattern.value} key={pattern.value}>
                            {pattern.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Schrift
                      <select name="fontStyle" defaultValue={editableProfile.fontStyle}>
                        {fontOptions.map((font) => (
                          <option value={font.value} key={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={`font-preview-card font-${editableProfile.fontStyle}`}>
                      Vorschau: Dein Profil kann anders klingen, bevor man liest.
                    </div>
                    <label>
                      Layout
                      <select name="layoutDensity" defaultValue={editableProfile.layoutDensity}>
                        {densityOptions.map((density) => (
                          <option value={density.value} key={density.value}>
                            {density.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="check-label">
                      <input name="glitter" type="checkbox" defaultChecked={editableProfile.glitter} />
                      Glitzer-Modus
                    </label>
                    {isAdmin && (
                      <label className="check-label">
                        <input name="verified" type="checkbox" defaultChecked={editableProfile.verified} />
                        Blauer Verifizierungshaken
                      </label>
                    )}
                    {isAdmin && (
                      <label>
                        Neues Passwort setzen
                        <input name="newPassword" type="password" placeholder="Leer lassen = unverändert" />
                      </label>
                    )}
                    <div className="modal-actions">
                      <button className="aqua-button">Speichern</button>
                      {isAdmin && editableProfile.id !== "kimon" && (
                        <button className="danger-button" type="button" onClick={deleteProfile}>
                          Profil loeschen
                        </button>
                      )}
                      <button className="secondary-button" type="button" onClick={() => setEditProfileOpen(false)}>
                        Schliessen
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {toast && <div className="fish-toast">{toast}</div>}
    </main>
  );
}
