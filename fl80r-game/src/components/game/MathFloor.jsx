import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchesAnswer } from "@/lib/answers";

// Solve the math (or story riddle) to advance.
export default function MathFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | solved
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (matchesAnswer(input, floorData.accepts, floorData.answer)) {
      setStatus("solved");
      setInput("");
      setTimeout(() => onAdvance(floorData.nextFloor), 800);
    } else {
      setStatus("wrong");
      setAttempts(a => a + 1);
      setTimeout(() => setStatus("idle"), 1200);
      setInput("");
    }
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Math badge + Story Riddle pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase border border-accent/30 rounded px-2 py-1">
          ∑ Math Challenge
        </span>
        {floorData.story && (
          <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
            ⌂ Story Riddle
          </span>
        )}
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
            disabled={status === "solved"}
            className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
            style={{
              borderColor:
                status === "solved" ? "hsl(158 64% 52%)" :
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
          {status === "solved" && (
            <motion.p key="solved" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-primary glow-green font-mono-game text-sm">
              ✓ Correct. Advancing...
            </motion.p>
          )}
          {status === "wrong" && (
            <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-destructive font-mono-game text-sm">
              ✗ Incorrect. Check your work.
            </motion.p>
          )}
        </AnimatePresence>

        {attempts >= 4 && status !== "solved" && (
          <p className="text-muted-foreground/40 font-mono-game text-xs">
            Hint: {floorData.hint}
          </p>
        )}
      </form>

      <p className="text-muted-foreground/30 text-xs font-mono-game">
        Attempts: {attempts}
      </p>
    </motion.div>
  );
}
