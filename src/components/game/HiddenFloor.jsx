import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HiddenFloor({ floor, floorData, onAdvance }) {
  const [hovered, setHovered] = useState(false);
  const [found, setFound] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [attempts, setAttempts] = useState(0);

  const pos = useRef({
    x: 8 + Math.random() * 80,
    y: 8 + Math.random() * 78,
  });

  const handleHiddenClick = () => {
    if (found) return;
    setFound(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = input.trim().toLowerCase();
    const correct = floorData.hiddenText.trim().toLowerCase();
    if (normalized === correct) {
      setStatus("correct");
      setTimeout(() => onAdvance(floorData.nextFloor), 900);
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
      className="relative"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      {/* Description + clue */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-4 pb-2 pointer-events-none z-10">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="terminal-border rounded-md p-4">
            <p className="text-foreground/90 font-mono-game text-sm leading-relaxed whitespace-pre-line">
              {floorData.description}
            </p>
          </div>
          <div className="border-l-2 border-primary/30 pl-4">
            <p className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game mb-1">Clue</p>
            <p className="text-foreground/70 font-mono-game text-sm">{floorData.clue}</p>
          </div>
        </div>
      </div>

      {/* Hidden text */}
      {!found && (
        <div
          className="absolute select-none z-20"
          style={{
            left: `${pos.current.x}%`,
            top: `${pos.current.y}%`,
            transform: "translate(-50%, -50%)",
            padding: "20px 24px",
            cursor: "pointer",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={handleHiddenClick}
        >
          <p
            className="font-mono-game text-sm tracking-widest"
            style={{
              color: hovered ? `${floorData.hiddenColor}dd` : floorData.hiddenColor,
              transition: "color 0.3s ease",
              userSelect: "none",
            }}
          >
            {floorData.hiddenText}
          </p>
        </div>
      )}

      {/* Input phase — after found */}
      <AnimatePresence>
        {found && status !== "correct" && (
          <motion.div
            key="input-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-0 left-0 right-0 px-4 pb-10 z-30"
          >
            <div className="max-w-lg mx-auto space-y-3">
              {/* Revealed message display */}
              <div className="border border-primary/30 rounded-md px-4 py-2 bg-primary/5">
                <p className="text-[10px] text-primary/50 font-mono-game tracking-widest uppercase mb-1">
                  ✓ Message found — now type it exactly
                </p>
                <p
                  className="font-mono-game text-sm glow-green"
                  style={{ color: "hsl(158 64% 52%)", textShadow: "0 0 10px hsl(158 64% 52% / 0.6)" }}
                >
                  {floorData.hiddenText}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="type the message..."
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
                    <motion.p key="wrong" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-destructive font-mono-game text-xs">
                      ✗ Not quite right. Type exactly what you see above.
                    </motion.p>
                  )}
                </AnimatePresence>

                {attempts >= 3 && (
                  <p className="text-muted-foreground/30 font-mono-game text-xs">
                    Hint: copy it exactly, including punctuation and arrows.
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correct — advancing */}
      <AnimatePresence>
        {status === "correct" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-primary glow-green font-vt323 text-3xl tracking-widest pointer-events-none z-40"
          >
            CONFIRMED — ADVANCING...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Ambient hint */}
      {!found && (
        <motion.p
          className="absolute bottom-6 left-0 right-0 text-center font-mono-game text-[10px] text-muted-foreground/20 tracking-widest pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          something is hidden somewhere on this screen...
        </motion.p>
      )}
    </motion.div>
  );
}