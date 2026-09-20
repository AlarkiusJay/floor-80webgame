import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RickrollFloor({ onAdvance }) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("riddle"); // riddle | buffering
  const [bufferProgress, setBufferProgress] = useState(0);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (phase !== "buffering") return;

    // Fake buffer progress — jumps around like a real bad connection
    const progressInterval = setInterval(() => {
      setBufferProgress(prev => {
        if (prev >= 95) return prev; // stall near the end, never reaching 100
        const jump = Math.random() * 12;
        return Math.min(prev + jump, 95);
      });
    }, 600);

    // Countdown to advance
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          clearInterval(progressInterval);
          setTimeout(() => onAdvance(41), 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
    };
  }, [phase]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPhase("buffering");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ★ FLOOR 40.5
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest">
          — The Interlude
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Riddle ── */}
        {phase === "riddle" && (
          <motion.div
            key="riddle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="terminal-border rounded-md p-5">
              <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
                {`You find a door wedged between floors 40 and 41.\n\nIt shouldn't exist. The blueprint doesn't show it.\n\nA note is pinned to the door:\n\n  "We're no strangers to love.\n   You know the rules — and so do I.\n   A full commitment's what I'm thinking of.\n   What am I never going to do?"`}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
                Complete the phrase...
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="never gonna..."
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="submit"
                  className="font-vt323 text-xl px-5 py-2 border border-primary/40 text-primary rounded hover:bg-primary/10 transition-all tracking-widest"
                >
                  ENTER
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── STEP 2: Fake buffering video ── */}
        {phase === "buffering" && (
          <motion.div
            key="buffering"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Correct feedback */}
            <p className="font-mono-game text-xs text-primary/60 tracking-widest">
              ✓ CORRECT — loading your reward...
            </p>

            {/* Fake video player */}
            <div
              className="relative w-full rounded-md overflow-hidden border border-border"
              style={{ aspectRatio: "16/9", background: "#000" }}
            >
              {/* Fake thumbnail — blurred/dark */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #1a0a0a 0%, #0d0d0d 50%, #0a1020 100%)",
                }}
              />

              {/* Video title bar (fake YouTube-ish) */}
              <div className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <div className="w-2 h-2 rounded-full bg-destructive/70" />
                <p className="font-mono-game text-xs text-foreground/50 truncate">
                  Rick Astley - Never Gonna Give You Up (Official Video)
                </p>
              </div>

              {/* Center buffering spinner */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  className="w-12 h-12 border-4 border-foreground/10 border-t-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="font-mono-game text-xs text-foreground/40 tracking-widest">
                  Buffering...
                </p>
              </div>

              {/* Fake progress bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10">
                <motion.div
                  className="h-full bg-destructive/70"
                  style={{ width: `${bufferProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Connection quality */}
            <div className="flex items-center justify-between font-mono-game text-xs text-muted-foreground/40">
              <span>Connection quality: terrible</span>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {Math.round(bufferProgress)}% loaded
              </motion.span>
            </div>

            {/* Stalled message */}
            <motion.p
              className="text-center font-mono-game text-xs text-muted-foreground/25 tracking-widest"
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              video will play shortly... probably
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}