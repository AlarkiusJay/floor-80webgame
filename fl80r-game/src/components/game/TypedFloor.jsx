import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isCloseGuess } from "@/data/relatedWords";

// Renders tally marks: groups of 5 (𝙸𝙸𝙸𝙸 with a cross on 5th)
function renderTally(count) {
  const groups = Math.floor(count / 5);
  const remainder = count % 5;
  let tally = "";
  for (let i = 0; i < groups; i++) tally += "𝙸𝙸𝙸𝙸 ";
  for (let i = 0; i < remainder; i++) tally += "𝙸";
  return tally.trim() || "";
}

export default function TypedFloor({ floor, floorData, onAdvance }) {
  const isMemoryFloor = !!floorData.memoryFloor;
  // step: "memory" (recall past answer) | "riddle" (solve new riddle) | "normal" (no memory mechanic)
  const [step, setStep] = useState(isMemoryFloor ? "memory" : "normal");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | correct | wrong | warm | unlocked
  const [attempts, setAttempts] = useState(0);
  const [hintOpacity, setHintOpacity] = useState(0);
  const [tallyCount, setTallyCount] = useState(0);

  // Current active data depends on step
  const activeData = step === "riddle" ? floorData.secondRiddle : floorData;
  const activeAnswer = step === "memory"
    ? floorData.memoryAnswer
    : activeData.answer;

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = input.trim().toLowerCase();
    const correct = activeAnswer.toLowerCase();

    if (normalized === correct) {
      if (step === "memory") {
        // Correct memory answer — unlock the second riddle
        setStatus("unlocked");
        setInput("");
        setTimeout(() => {
          setStep("riddle");
          setStatus("idle");
          setAttempts(0);
          setHintOpacity(0);
          setTallyCount(0);
        }, 1000);
      } else {
        setStatus("correct");
        setTimeout(() => onAdvance(floorData.nextFloor), 900);
      }
    } else {
      const close = isCloseGuess(normalized, correct, floor);
      if (close) setTallyCount(t => t + 1);
      setStatus(close ? "warm" : "wrong");
      setAttempts(a => {
        const next = a + 1;
        if (next >= 12) {
          setHintOpacity(Math.min(0.7, (next - 11) * 0.08));
        }
        return next;
      });
      setTimeout(() => setStatus("idle"), 1400);
      setInput("");
    }
  };

  return (
    <motion.div
      key={`${floor}-${step}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Memory step badge */}
      {step === "memory" && (
        <div className="flex items-center gap-2">
          <span className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase border border-accent/30 rounded px-2 py-1">
            ⟳ Memory Check — Floor {floorData.memoryFloor}
          </span>
        </div>
      )}
      {step === "riddle" && (
        <div className="flex items-center gap-2">
          <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
            ✓ Memory Unlocked — New Riddle
          </span>
        </div>
      )}

      {/* Description */}
      <div className="terminal-border rounded-md p-5">
        <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
          {step === "riddle" ? floorData.secondRiddle.description : floorData.description}
        </p>
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
          {step === "riddle" ? floorData.secondRiddle.clue : floorData.clue}
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="type your answer..."
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
            style={{
              borderColor:
                status === "correct" || status === "unlocked" ? "hsl(158 64% 52%)" :
                status === "wrong" ? "hsl(0 72% 51%)" :
                status === "warm" ? "hsl(43 96% 56%)" : undefined,
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
              ✓ Correct! Advancing to next floor...
            </motion.p>
          )}
          {status === "unlocked" && (
            <motion.p key="unlocked" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-primary glow-green font-mono-game text-sm">
              ✓ Memory confirmed. A new riddle materializes...
            </motion.p>
          )}
          {status === "wrong" && (
            <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-destructive font-mono-game text-sm">
              {step === "memory" ? "✗ That's not what you said back there. Think harder." : "✗ Incorrect. Try again."}
            </motion.p>
          )}
          {status === "warm" && (
            <motion.p key="warm" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-accent glow-amber font-mono-game text-sm">
              ≈ Close... you're in the right territory.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Tally marks for close guesses */}
        {tallyCount > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-xs font-mono-game tracking-widest">close guesses:</span>
            <span className="font-mono-game text-accent/70 text-sm tracking-wider">
              {renderTally(tallyCount)}
            </span>
          </div>
        )}
      </form>

      {/* Invisible hint — fades in after 12 attempts */}
      <p
        className="font-mono-game text-xs text-primary transition-all duration-1000"
        style={{ opacity: hintOpacity, userSelect: hintOpacity > 0 ? "text" : "none" }}
      >
        ↳ {activeAnswer}
      </p>

      <p className="text-muted-foreground/30 text-xs font-mono-game">
        Attempts: {attempts}
      </p>
    </motion.div>
  );
}