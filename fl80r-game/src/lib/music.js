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
    return v !== null ? Number(v) / 100 : 0.15;
  } catch {
    return 0.15;
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
  a.loop = true;
  a.volume = readVolume();
  a.muted = readMuted();

  clearGesture();

  // On the first user interaction, play with the user's real mute setting.
  const onGesture = () => {
    a.muted = readMuted();
    a.play().then(clearGesture).catch(() => {});
  };
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture);
  gestureCleanup = () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    window.removeEventListener("touchstart", onGesture);
    gestureCleanup = null;
  };

  // Autostart: try to play immediately. If the browser blocks audible
  // autoplay, fall back to muted autoplay (allowed everywhere) so the loop
  // is already running, then unmute on the first interaction above.
  a.play()
    .then(clearGesture)
    .catch(() => {
      if (!readMuted()) {
        a.muted = true;
        a.play().catch(() => {});
      }
    });
}

function clearGesture() {
  if (gestureCleanup) gestureCleanup();
}

// ── Sound effects (separate channel from the music theme) ─────────────────
// Own volume + mute, persisted under their own keys so VFX and music are
// controlled independently.
const SFX_VOLUME_KEY = "fl80r_sfx_volume";
const SFX_MUTE_KEY = "fl80r_sfx_muted";

export function getSfxVolume() { // 0-100
  try {
    const v = localStorage.getItem(SFX_VOLUME_KEY);
    return v !== null ? Number(v) : 70;
  } catch {
    return 70;
  }
}

export function setSfxVolume(pct) {
  try { localStorage.setItem(SFX_VOLUME_KEY, String(pct)); } catch { /* ignore */ }
}

export function isSfxMuted() {
  try { return localStorage.getItem(SFX_MUTE_KEY) === "1"; } catch { return false; }
}

export function setSfxMuted(muted) {
  try { localStorage.setItem(SFX_MUTE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
}

// Play a one-shot sound effect at the user's SFX volume (respects SFX mute).
// Audio elements are cached per src so repeat plays are cheap.
const sfxCache = {};
export function playSfx(src) {
  if (isSfxMuted()) return;
  try {
    let a = sfxCache[src];
    if (!a) { a = new Audio(src); sfxCache[src] = a; }
    a.volume = Math.max(0, Math.min(1, getSfxVolume() / 100));
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch { /* ignore */ }
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
