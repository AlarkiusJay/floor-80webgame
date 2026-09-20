import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Step 1: Solve math → Step 2: Hunt for hidden EXIT anywhere on screen
export default function MathFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | solved
  const [attempts, setAttempts] = useState(0);
  const [exitFound, setExitFound] = useState(false);

  // Random position for EXIT sign (% based, so it works on all screen sizes)
  const exitPos = useRef({
    x: 10 + Math.random() * 75, // 10–85%
    y: 20 + Math.random() * 55, // 20–75%
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = input.trim().toLowerCase();
    const correct = String(floorData.answer).toLowerCase();
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

  const handleExitClick = () => {
    if (status !== "solved") return;
    setExitFound(true);
    setTimeout(() => onAdvance(floorData.nextFloor), 700);
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
      style={{ minHeight: "100vh" }}
    >
      {/* ── STEP 1: Math puzzle ── */}
      <AnimatePresence>
        {status !== "solved" && (
          <motion.div
            key="math"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto px-4 py-8 space-y-8"
          >
            {/* Math badge */}
            <div className="flex items-center gap-2">
              <span className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase border border-accent/30 rounded px-2 py-1">
                ∑ Math Challenge
              </span>
            </div>

            {/* Puzzle */}
            <div className="terminal-border rounded-md p-5">
              <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
                {floorData.description}
              </p>
            </div>

            {/* Input form */}
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
                  style={{
                    borderColor: status === "wrong" ? "hsl(0 72% 51%)" : undefined,
                  }}
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
                    ✗ Incorrect. Check your work.
                  </motion.p>
                )}
              </AnimatePresence>

              {attempts >= 4 && (
                <p className="text-muted-foreground/40 font-mono-game text-xs">
                  Hint: {floorData.hint}
                </p>
              )}
            </form>

            <p className="text-muted-foreground/30 text-xs font-mono-game">
              Attempts: {attempts}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP 2: Hunt for the EXIT ── */}
      {status === "solved" && (
        <motion.div
          key="hunt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0"
          style={{ backgroundColor: floorData.bg || "#0a0f0d", zIndex: 50 }}
        >
          {/* Instruction at top */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute top-6 left-0 right-0 flex justify-center"
          >
            <span className="font-mono-game text-xs text-primary/60 tracking-widest border border-primary/20 rounded px-3 py-1">
              ✓ CORRECT — now find the EXIT hidden somewhere on this screen
            </span>
          </motion.div>

          {/* Invisible EXIT — tap/click anywhere near it to advance */}
          <div
            className="absolute select-none"
            style={{
              left: `${exitPos.current.x}%`,
              top: `${exitPos.current.y}%`,
              transform: "translate(-50%, -50%)",
              cursor: exitFound ? "default" : "pointer",
            }}
            onClick={handleExitClick}
          >
            <p
              className="font-mono-game text-sm tracking-widest"
              style={{
                color: exitFound
                  ? "hsl(158 64% 52%)"
                  : `${floorData.bg || "#0a0f0d"}`,
                // text is same color as bg — nearly invisible
                // slight contrast so it's findable by feel/touch
                textShadow: exitFound
                  ? "0 0 12px hsl(158 64% 52%)"
                  : `0 0 1px rgba(255,255,255,0.04)`,
                transition: "color 0.3s, text-shadow 0.3s",
                padding: "16px 24px",
                userSelect: "none",
              }}
            >
              [ EXIT ]
            </p>
          </div>

          {/* Subtle ambient hint — very faint */}
          {!exitFound && (
            <motion.p
              className="absolute bottom-8 left-0 right-0 text-center font-mono-game text-[10px] text-muted-foreground/20 tracking-widest"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              touch anywhere... the exit is hiding
            </motion.p>
          )}

          {exitFound && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center font-vt323 text-3xl text-primary glow-green tracking-widest"
            >
              EXIT FOUND — ADVANCING...
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}