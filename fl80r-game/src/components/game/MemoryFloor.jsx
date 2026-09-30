import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchesAnswer } from "@/lib/answers";

// Fixed memory floor: the answer can't be derived from the floor's own text —
// it reuses a number the player earned at an earlier "source" floor.
//   kind "recall" -> re-enter the carried number.
//   kind "clock"  -> add the carried minutes to a base time.
// Wrong answers always buzz (never silence); the answer fades in after a while
// so a forgotten number can never hard soft-lock the run.
export default function MemoryFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [attempts, setAttempts] = useState(0);
  const [hintOpacity, setHintOpacity] = useState(0);

  const isClock = floorData.kind === "clock";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (matchesAnswer(input, floorData.accepts, floorData.answer)) {
      setStatus("correct");
      setTimeout(() => onAdvance(floorData.nextFloor), 900);
      return;
    }
    // Never silent — always a buzz.
    setStatus("wrong");
    setInput("");
    setAttempts((a) => {
      const next = a + 1;
      if (next >= 6) setHintOpacity(Math.min(0.75, (next - 5) * 0.12));
      return next;
    });
    setTimeout(() => setStatus("idle"), 1400);
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Memory badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase border border-accent/30 rounded px-2 py-1">
          ⟳ Memory Floor
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest uppercase">
          recall from Floor {floorData.sourceFloor}
        </span>
      </div>

      {/* Prompt */}
      <div className="terminal-border rounded-md p-5">
        <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
          {floorData.description}
        </p>
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
          {floorData.clue}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isClock ? "time..." : "the number..."}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
            style={{
              borderColor:
                status === "correct" ? "hsl(158 64% 52%)" :
                status === "wrong" ? "hsl(0 72% 51%)" : undefined,
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
          {status === "correct" && (
            <motion.p key="correct" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-primary glow-green font-mono-game text-sm">
              ✓ You kept the number. Advancing...
            </motion.p>
          )}
          {status === "wrong" && (
            <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-destructive font-mono-game text-sm">
              ✗ The building buzzes. That's not what you carried.
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {/* Answer fades in after several misses so a forgotten number never locks the run. */}
      <p
        className="font-mono-game text-xs text-primary transition-all duration-1000"
        style={{ opacity: hintOpacity, userSelect: hintOpacity > 0 ? "text" : "none" }}
      >
        ↳ {floorData.hint}
      </p>

      <p className="text-muted-foreground/30 text-xs font-mono-game">
        Attempts: {attempts}
      </p>
    </motion.div>
  );
}
