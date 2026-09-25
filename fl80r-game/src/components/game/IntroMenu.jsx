import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Cat, Star, X, Coffee, Github, RotateCw } from "lucide-react";
import { setMusicVolume } from "@/lib/music";

const KOFI_URL = "https://ko-fi.com/alarkiusej/tiers";
const ISSUES_URL = "https://github.com/AlarkiusJay/floor-80webgame/issues";
const HUB_CONTRIBUTORS_URL = "https://www.fl80r.party/hub/contributors.html";
// Supporters live in /contributors.json (edit fl80r-game/public/contributors.json,
// newest first). The game shows the latest few; the hub shows the full list.
const LATEST_COUNT = 6;

function Panel({ title, icon, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative terminal-border rounded-md w-full max-w-md p-5 sm:p-6"
        style={{ backgroundColor: "#050807" }}
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-primary glow-green font-mono-game text-sm tracking-[0.25em] uppercase">
            {icon}
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function IntroMenu() {
  const [open, setOpen] = useState(null); // "settings" | "donate" | "credits" | null

  const [volume, setVolume] = useState(() => {
    try {
      const v = localStorage.getItem("fl80r_music_volume");
      return v !== null ? Number(v) : 15;
    } catch {
      return 15;
    }
  });

  useEffect(() => {
    setMusicVolume(volume); // apply to the playing theme live
    try {
      localStorage.setItem("fl80r_music_volume", String(volume));
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [volume]);

  // Latest supporters (full list lives on the hub).
  const [contributors, setContributors] = useState([]);
  const [contribLoaded, setContribLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/contributors.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (alive) {
          setContributors(Array.isArray(data) ? data : []);
          setContribLoaded(true);
        }
      })
      .catch(() => alive && setContribLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // Mobile-only refresh (pull-to-refresh is disabled during puzzles).
  const [isMobile] = useState(() => {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  });
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  useEffect(() => {
    if (open !== "settings") setConfirmRefresh(false);
  }, [open]);

  const close = useCallback(() => setOpen(null), []);

  const NavButton = ({ id, icon, label }) => (
    <button
      onClick={() => setOpen(id)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-primary/25 bg-black/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all font-mono-game text-[10px] sm:text-xs tracking-widest uppercase"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <>
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <NavButton id="settings" icon={<Settings size={14} />} label="Settings" />
        <NavButton id="donate" icon={<Cat size={14} />} label="Donate" />
        <NavButton id="credits" icon={<Star size={14} />} label="Credits" />
      </div>

      <AnimatePresence>
        {open === "settings" && (
          <Panel
            key="settings"
            title="Settings"
            icon={<Settings size={16} />}
            onClose={close}
          >
            <div className="space-y-5 font-mono-game">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="music-vol"
                    className="text-xs text-foreground/70 tracking-widest uppercase"
                  >
                    Music Volume
                  </label>
                  <span className="text-xs text-primary tabular-nums">
                    {volume}%
                  </span>
                </div>
                <input
                  id="music-vol"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: "hsl(158 64% 52%)" }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                🎵 Controls the main screen theme.
              </p>

              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded border border-primary/25 bg-black/30 px-3 py-2.5 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Github size={18} className="shrink-0" />
                <span className="text-xs leading-relaxed">
                  See a bug or issue? Or want to request a feature? Report to us
                  on GitHub!
                </span>
              </a>

              {isMobile &&
                (!confirmRefresh ? (
                  <button
                    onClick={() => setConfirmRefresh(true)}
                    className="flex w-full items-center justify-center gap-2 rounded border border-primary/25 bg-black/30 px-3 py-2.5 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all text-xs tracking-widest uppercase"
                  >
                    <RotateCw size={15} /> Refresh Game
                  </button>
                ) : (
                  <div className="rounded border border-accent/30 bg-accent/5 px-3 py-3 text-center">
                    <p className="text-[11px] text-accent glow-amber leading-relaxed mb-2.5">
                      ⚠ Reload the game? Your current run will be lost.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => window.location.reload()}
                        className="rounded border border-primary bg-primary/10 px-4 py-1.5 text-primary text-xs tracking-widest uppercase hover:bg-primary/20 transition-all"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRefresh(false)}
                        className="rounded border border-border px-4 py-1.5 text-muted-foreground text-xs tracking-widest uppercase hover:text-foreground transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}

              <p className="pt-1 text-center text-[10px] tracking-widest uppercase text-muted-foreground/70">
                FL80R by Alarkius Elvya Jay
              </p>
            </div>
          </Panel>
        )}

        {open === "donate" && (
          <Panel
            key="donate"
            title="Feed the Cats"
            icon={<Cat size={16} />}
            onClose={close}
          >
            <div className="space-y-5 font-mono-game text-center">
              <div className="text-5xl leading-none select-none">🐱</div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Every 10 floors, a cat demands tribute. Yours keeps the cats fed.
              </p>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-primary/50 text-primary glow-green hover:bg-primary/10 hover:border-primary transition-all text-sm tracking-widest uppercase"
              >
                <Coffee size={16} />
                Support on Ko-fi
              </a>
            </div>
          </Panel>
        )}

        {open === "credits" && (
          <Panel
            key="credits"
            title="Credits"
            icon={<Star size={16} />}
            onClose={close}
          >
            <div className="space-y-4 font-mono-game text-center">
              <p className="text-[10px] text-muted-foreground tracking-[0.25em] uppercase">
                Latest Meowspporters
              </p>

              {!contribLoaded ? (
                <p className="text-xs text-muted-foreground/50">Loading…</p>
              ) : contributors.length === 0 ? (
                <p className="text-sm text-foreground/60 leading-relaxed italic px-2">
                  The Cats are Purring. Come back Soon until Meowspporters have
                  come~!
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {contributors.slice(0, LATEST_COUNT).map((c, i) => (
                    <li key={(c.name || "") + i} className="text-sm text-primary/90">
                      {c.name}
                      {c.tier ? (
                        <span className="text-muted-foreground/60 text-xs"> · {c.tier}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {contribLoaded && contributors.length > 0 && (
                <a
                  href={HUB_CONTRIBUTORS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary tracking-widest uppercase transition-colors"
                >
                  See all supporters →
                </a>
              )}

              <div>
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-primary/60 hover:text-primary tracking-widest uppercase transition-colors"
                >
                  <Star size={12} />
                  Become a Meowspporter
                </a>
              </div>
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </>
  );
}
