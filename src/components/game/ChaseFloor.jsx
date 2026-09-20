import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHASE_DURATION = 300; // 5 minutes in seconds
const SLOWDOWN_THRESHOLD = 210; // 5:00 - 1:30 = 3:30 remaining = 210s

// Random spider web positions (fixed per session)
const WEB_POSITIONS = [
  { x: 5, y: 5 }, { x: 88, y: 8 }, { x: 10, y: 85 },
  { x: 82, y: 80 }, { x: 45, y: 12 }, { x: 50, y: 88 },
];

export default function ChaseFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | solved
  const [attempts, setAttempts] = useState(0);
  const [caught, setCaught] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHASE_DURATION);
  const [slowed, setSlowed] = useState(false);

  // Position of the darting element — random jumps every 500ms
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  const startChase = () => {
    intervalRef.current = setInterval(() => {
      setPos({
        x: 8 + Math.random() * 82,
        y: 15 + Math.random() * 70,
      });
    }, 500);

    // 5-minute countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Trigger slowdown past 1m30s mark
  useEffect(() => {
    if (status === "solved" && timeLeft <= SLOWDOWN_THRESHOLD && !slowed) {
      setSlowed(true);
      // Slow the movement interval
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setPos({
          x: 8 + Math.random() * 82,
          y: 15 + Math.random() * 70,
        });
      }, 1100);
    }
  }, [timeLeft, status, slowed]);

  useEffect(() => {
    if (status === "solved") startChase();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = input.trim().toLowerCase();
    const correct = floorData.answer.toLowerCase();
    if (normalized === correct) {
      setStatus("solved");
      setInput("");
    } else {
      setStatus("wrong");
      setAttempts(a => a + 1);
      setTimeout(() => setStatus("idle"), 1200);
      setInput("");
    }
  };

  const handleCatch = () => {
    if (caught) return;
    clearInterval(intervalRef.current);
    setCaught(true);
    setTimeout(() => onAdvance(floorData.nextFloor), 800);
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      {/* ── STEP 1: Riddle ── */}
      <AnimatePresence>
        {status !== "solved" && (
          <motion.div
            key="riddle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto px-4 py-8 space-y-8"
          >
            {/* Chase badge */}
            <div className="flex items-center gap-2">
              <span className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase border border-accent/30 rounded px-2 py-1">
                ⚡ Chase Floor
              </span>
            </div>

            {/* Riddle */}
            <div className="terminal-border rounded-md p-5">
              <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
                {floorData.description}
              </p>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
                {floorData.clue}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="your answer..."
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
                  style={{ borderColor: status === "wrong" ? "hsl(0 72% 51%)" : undefined }}
                />
                <button
                  type="submit"
                  className="font-vt323 text-xl px-5 py-2 border border-primary/40 text-primary rounded hover:bg-primary/10 transition-all tracking-widest"
                >
                  ENTER
                </button>
              </div>

              <AnimatePresence mode="wait">
                {status === "wrong" && (
                  <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-destructive font-mono-game text-sm">
                    ✗ Incorrect. Think harder.
                  </motion.p>
                )}
              </AnimatePresence>

              {attempts >= 4 && (
                <p className="text-muted-foreground/40 font-mono-game text-xs">
                  Hint: {floorData.hint}
                </p>
              )}
            </form>

            <p className="text-muted-foreground/30 text-xs font-mono-game">Attempts: {attempts}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP 2: Chase phase ── */}
      {status === "solved" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0"
          style={{ backgroundColor: floorData.bg || "#0a0f0d", zIndex: 40 }}
        >
          {/* Spider webs — appear after 1m30s */}
          <AnimatePresence>
            {slowed && WEB_POSITIONS.map((wp, i) => (
              <motion.div
                key={`web-${i}`}
                className="absolute pointer-events-none select-none z-10"
                style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: i * 0.18, duration: 0.5 }}
              >
                <span style={{ fontSize: "2.5rem" }}>🕸️</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Instruction + Timer */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-6 left-0 right-0 flex flex-col items-center gap-2"
          >
            <span className="font-mono-game text-xs text-primary/60 tracking-widest border border-primary/20 rounded px-3 py-1">
              ✓ CORRECT — now catch the {floorData.chaseLabel}!
            </span>
            {/* Timer */}
            <span
              className="font-vt323 text-2xl tracking-widest"
              style={{
                color: timeLeft <= 60
                  ? "hsl(0 72% 51%)"
                  : timeLeft <= SLOWDOWN_THRESHOLD
                  ? "hsl(43 96% 56%)"
                  : "hsl(158 64% 52% / 0.6)",
                textShadow: timeLeft <= 60
                  ? "0 0 10px hsl(0 72% 51% / 0.7)"
                  : timeLeft <= SLOWDOWN_THRESHOLD
                  ? "0 0 10px hsl(43 96% 56% / 0.6)"
                  : "none",
              }}
            >
              {formatTime(timeLeft)}
            </span>
            {slowed && (
              <motion.span
                className="font-mono-game text-[10px] tracking-widest"
                style={{ color: "hsl(43 96% 56% / 0.7)" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🕸️ the web slows it down...
              </motion.span>
            )}
          </motion.div>

          {/* Darting element */}
          {!caught && (
            <motion.div
              className="absolute select-none z-20 cursor-pointer"
              animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              transition={{ type: "tween", duration: slowed ? 0.5 : 0.15 }}
              style={{ transform: "translate(-50%, -50%)" }}
              onClick={handleCatch}
            >
              <span
                style={{
                  fontSize: "2rem",
                  filter: "drop-shadow(0 0 8px hsl(43 96% 56% / 0.6))",
                  userSelect: "none",
                }}
              >
                {floorData.chaseEmoji}
              </span>
            </motion.div>
          )}

          {/* Hint */}
          {!caught && (
            <motion.p
              className="absolute bottom-8 left-0 right-0 text-center font-mono-game text-[10px] text-muted-foreground/20 tracking-widest"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              it's moving fast... tap it to catch it
            </motion.p>
          )}

          {caught && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center font-vt323 text-3xl text-primary glow-green tracking-widest"
            >
              {floorData.chaseEmoji} CAUGHT — ADVANCING...
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}