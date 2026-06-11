export type FishRadioTrack = {
  title: string;
  artist: string;
  src: string;
  durationSeconds?: number;
};

export type FishRadioSlot = {
  kind: "song" | "host";
  title: string;
  artist: string;
  src: string;
  elapsed: number;
  duration: number;
  offset: number;
  progress: number;
  next?: FishRadioTrack;
};

export const fishRadioSongs: FishRadioTrack[] = [
  { title: "Moment", artist: "C4RL", src: "/music/c4rl-moment.mp3", durationSeconds: 148 },
  { title: "Party In The U.S.A.", artist: "Miley Cyrus", src: "/music/party-in-the-usa.mp3", durationSeconds: 208 },
  { title: "The One That Got Away", artist: "Katy Perry", src: "/music/the-one-that-got-away.mp3", durationSeconds: 228 },
  { title: "Call Me Maybe", artist: "Carly Rae Jepsen", src: "/music/call-me-maybe.mp3", durationSeconds: 194 },
  { title: "Kids", artist: "MGMT", src: "/music/mgmt-kids.mp3", durationSeconds: 302 },
  { title: "What Makes You Beautiful", artist: "One Direction", src: "/music/what-makes-you-beautiful.mp3", durationSeconds: 215 },
  { title: "Beauty And A Beat", artist: "Justin Bieber ft. Nicki Minaj", src: "/music/beauty-and-a-beat.mp3", durationSeconds: 294 },
  { title: "TiK ToK", artist: "Ke$ha", src: "/music/tik-tok.mp3", durationSeconds: 216 },
  { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", src: "/music/uptown-funk.mp3", durationSeconds: 271 },
  { title: "Counting Stars", artist: "OneRepublic", src: "/music/counting-stars.mp3", durationSeconds: 284 },
  { title: "Rock That Body", artist: "The Black Eyed Peas", src: "/music/rock-that-body.mp3", durationSeconds: 273 }
];

const fishRadioHosts: FishRadioTrack[] = [
  { title: "Moderation", artist: ".fish FM", src: "/music/fish-radio-host-1.mp3", durationSeconds: 10 },
  { title: "Moderation", artist: ".fish FM", src: "/music/fish-radio-host-2.mp3", durationSeconds: 13 },
  { title: "Moderation", artist: ".fish FM", src: "/music/fish-radio-host-3.mp3", durationSeconds: 11 }
];

const hostSlotSeconds = 14;
const groupPattern = [2, 3, 2, 3, 1];
const cycleSeconds =
  fishRadioSongs.reduce((sum, song) => sum + (song.durationSeconds || 240), 0) +
  (groupPattern.length - 1) * hostSlotSeconds;

function seededNumber(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededNumber(seed + index * 31) * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function getFishRadioSlot(now = Date.now()): FishRadioSlot {
  const totalSeconds = Math.floor(now / 1000);
  const cycleIndex = Math.floor(totalSeconds / cycleSeconds);
  let remaining = totalSeconds % cycleSeconds;
  const songs = seededShuffle(fishRadioSongs, cycleIndex + 27);
  const hosts = seededShuffle(fishRadioHosts, Math.floor(cycleIndex / fishRadioHosts.length) + 91);
  let songIndex = 0;
  let hostIndex = 0;

  for (let groupIndex = 0; groupIndex < groupPattern.length; groupIndex += 1) {
    const groupSize = groupPattern[groupIndex];
    for (let index = 0; index < groupSize; index += 1) {
      const track = songs[songIndex];
      const songDuration = track.durationSeconds || 240;
      if (remaining < songDuration) {
        return {
          kind: "song",
          ...track,
          elapsed: remaining,
          duration: songDuration,
          offset: 0,
          progress: (remaining / songDuration) * 100
        };
      }
      remaining -= songDuration;
      songIndex += 1;
    }

    if (groupIndex < groupPattern.length - 1) {
      const host = hosts[hostIndex % hosts.length];
      if (remaining < hostSlotSeconds) {
        return {
          kind: "host",
          ...host,
          elapsed: remaining,
          duration: hostSlotSeconds,
          offset: 0,
          progress: (remaining / hostSlotSeconds) * 100,
          next: songs[songIndex]
        };
      }
      remaining -= hostSlotSeconds;
      hostIndex += 1;
    }
  }

  const fallback = songs[0];
  return {
    kind: "song",
    ...fallback,
    elapsed: 0,
    duration: fallback.durationSeconds || 240,
    offset: 0,
    progress: 0
  };
}

export function seekSyncedRadioAudio(audio: HTMLAudioElement, slot: FishRadioSlot) {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  if (slot.kind === "host") {
    audio.currentTime = Math.min(slot.elapsed, Math.max(0, duration - 0.2));
    return;
  }

  if (duration > 0) {
    audio.currentTime = Math.min(slot.elapsed, Math.max(0, duration - 0.2));
  }
}
