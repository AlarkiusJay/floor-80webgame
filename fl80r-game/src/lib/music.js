// Singleton background-music manager for the main / how-to screens.
// The volume is kept in sync with the Settings slider (localStorage key
// "fl80r_music_volume", stored 0-100).

const VOLUME_KEY = "fl80r_music_volume";
const MUTE_KEY = "fl80r_music_muted";
const THEME_SRC = "/audio/fl80r-theme.mp3";

let audio = null;
let gestureCleanup = null;

function readVolume() {
  try {
    const v = localStorage.getItem(VOLUME_KEY);
    return v !== null ? Number(v) / 100 : 0.7;
  } catch {
    return 0.7;
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio(THEME_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = readVolume();
    audio.muted = readMuted();
  }
  return audio;
}

// Mute controls (persisted). Muting keeps the slider's volume intact.
export function isMuted() {
  return readMuted();
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (audio) audio.muted = muted;
}

export function toggleMuted() {
  const next = !readMuted();
  setMuted(next);
  return next;
}

// Live volume control from the slider (pct is 0-100).
export function setMusicVolume(pct) {
  const vol = Math.max(0, Math.min(1, pct / 100));
  if (audio) audio.volume = vol;
}

// Start (or resume) the theme. Browsers block autoplay until a user
// gesture, so if the immediate play() is rejected we retry on the first
// pointer/key interaction.
export function playTheme() {
  const a = ensureAudio();
  a.volume = readVolume();

  clearGesture();

  // Retry on the first user gesture if autoplay is blocked.
  const onGesture = () => {
    a.play().then(clearGesture).catch(() => {});
  };
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  gestureCleanup = () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    gestureCleanup = null;
  };

  // Try immediately (works if a gesture already happened).
  a.play().then(clearGesture).catch(() => {});
}

function clearGesture() {
  if (gestureCleanup) gestureCleanup();
}

// Stop the theme (e.g. when entering the actual game).
export function stopTheme() {
  clearGesture();
  if (audio) {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}
