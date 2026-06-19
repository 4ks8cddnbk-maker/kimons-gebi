// Synthesized iOS-style UI sounds via the Web Audio API — no audio files needed.
// All sounds are tiny oscillator blips; respects a localStorage on/off switch.

const STORAGE_KEY = "fish-sound-enabled-v1";

let ctx: AudioContext | null = null;
let enabled = true;

function readEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

// Initialise from storage as soon as the module loads in the browser.
if (typeof window !== "undefined") {
  enabled = readEnabled();
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage failures
  }
  if (value) {
    // Warm up the audio context inside the user gesture that flipped it on.
    void getCtx()?.resume();
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

type Tone = { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number };

function play(tones: Tone[]) {
  if (!enabled) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  const now = audio.currentTime;
  for (const tone of tones) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = tone.type || "sine";
    osc.frequency.value = tone.freq;
    const t0 = now + tone.start;
    const peak = tone.gain ?? 0.16;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

export function playKey() {
  play([{ freq: 880, start: 0, dur: 0.06, type: "square", gain: 0.05 }]);
}

export function playClick() {
  play([{ freq: 660, start: 0, dur: 0.05, type: "triangle", gain: 0.08 }]);
}

export function playUnlock() {
  play([
    { freq: 523.25, start: 0, dur: 0.12, type: "sine", gain: 0.12 },
    { freq: 783.99, start: 0.08, dur: 0.16, type: "sine", gain: 0.12 }
  ]);
}

export function playLock() {
  play([
    { freq: 659.25, start: 0, dur: 0.1, type: "sine", gain: 0.1 },
    { freq: 392, start: 0.07, dur: 0.16, type: "sine", gain: 0.1 }
  ]);
}

// Approximation of the classic iOS notification "tri-tone".
export function playTritone() {
  play([
    { freq: 1318.51, start: 0, dur: 0.14, type: "sine", gain: 0.14 },
    { freq: 1046.5, start: 0.13, dur: 0.14, type: "sine", gain: 0.14 },
    { freq: 1567.98, start: 0.26, dur: 0.22, type: "sine", gain: 0.14 }
  ]);
}
