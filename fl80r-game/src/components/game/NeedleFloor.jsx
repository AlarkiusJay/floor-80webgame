import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Needle floor (Type 9, Variant A) ──
// A wall of one base glyph hides a handful of near-identical "needles"
// (e.g. a 0 among a field of O). The player counts the odd ones out and types
// the number to advance. Bigger walls (more rows) carry more needles.
//
// Difficulty scales with tier: higher tiers get larger walls and sneakier
// look-alike pairs. After several wrong counts the needles softly glow so a
// stuck player can recount — never a hard lock (the building has no mercy, but
// it won't trap you).

// [base, needle] look-alike pairs per tier. The needle is the minority glyph.
// Everything is UPPERCASE or a digit — never lowercase — so the only difference
// is stroke shape, not case. Higher tiers use sneakier look-alikes; the nastiest
// (1 vs I) lives in tier 3.
const TIER_CFG = {
  1: { rows: [3, 5],  cols: 14, perRow: [0.5, 1.1],
       pairs: [["O", "0"], ["E", "3"], ["S", "5"], ["B", "8"]] },
  2: { rows: [6, 8],  cols: 18, perRow: [0.6, 1.2],
       pairs: [["L", "I"], ["X", "Y"], ["V", "A"], ["Z", "2"], ["O", "0"]] },
  3: { rows: [9, 13], cols: 22, perRow: [0.7, 1.4],
       pairs: [["1", "I"], ["I", "L"], ["U", "V"], ["O", "Q"], ["G", "6"], ["O", "0"]] },
};

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const rf = (a, b) => a + Math.random() * (b - a);

export default function NeedleFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [attempts, setAttempts] = useState(0);

  // Build the wall once per mount (stable across re-renders). A page refresh
  // regenerates the whole run, so the wall re-rolls then.
  const built = useRef(null);
  if (!built.current) {
    const cfg = TIER_CFG[floorData.tier] || TIER_CFG[1];
    const rows = ri(cfg.rows[0], cfg.rows[1]);
    const cols = cfg.cols;
    const [base, needle] = cfg.pairs[Math.floor(Math.random() * cfg.pairs.length)];
    const total = rows * cols;
    let n = Math.round(rows * rf(cfg.perRow[0], cfg.perRow[1]));
    n = Math.max(2, Math.min(n, Math.floor(total * 0.18))); // keep density sane
    const positions = new Set();
    while (positions.size < n) positions.add(Math.floor(Math.random() * total));
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        row.push({ g: positions.has(idx) ? needle : base, needle: positions.has(idx) });
      }
      grid.push(row);
    }
    built.current = { grid, count: n };
  }
  const { grid, count } = built.current;

  // After enough misses, light up the needles so the player can recount.
  const assist = attempts >= 6;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(input.trim(), 10);
    if (!Number.isNaN(val) && val === count) {
      setStatus("correct");
      setTimeout(() => onAdvance(floorData.nextFloor), 800);
      return;
    }
    setStatus("wrong");
    setInput("");
    setAttempts((a) => a + 1);
    setTimeout(() => setStatus("idle"), 1200);
  };

  const baseColor = "hsl(158 20% 62%)";
  const glow = "hsl(158 64% 52%)";

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ⌕ Needle Floor
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest uppercase">
          observation — count the odd ones
        </span>
      </div>

      {/* Instruction */}
      <div className="terminal-border rounded-md p-5">
        <p className="text-foreground/90 font-mono-game text-sm leading-relaxed">
          A wall of identical marks covers the door. A few of them are impostors —
          almost the same, but not quite.
          <br />
          Find every mark that doesn&apos;t belong, then type how many you counted.
        </p>
      </div>

      {/* The wall */}
      <div className="rounded-md border border-border bg-black/30 p-4 overflow-x-auto">
        <div
          className="inline-block select-none font-mono-game"
          style={{ fontSize: "clamp(15px, 4.2vw, 26px)", lineHeight: 1.35, letterSpacing: "0.18em" }}
        >
          {grid.map((row, r) => (
            <div key={r} className="whitespace-nowrap">
              {row.map((cell, c) => (
                <span
                  key={c}
                  style={{
                    color: cell.needle && assist ? glow : baseColor,
                    textShadow: cell.needle && assist ? `0 0 8px ${glow}` : "none",
                    transition: "color 0.4s, text-shadow 0.4s",
                  }}
                >
                  {cell.g}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
          How many impostors? Enter the number.
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="count..."
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
              ✓ Every impostor found. Advancing...
            </motion.p>
          )}
          {status === "wrong" && (
            <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-destructive font-mono-game text-sm">
              ✗ Wrong count. Look closer.
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {/* Assist note once the needles start glowing */}
      {assist && (
        <p className="font-mono-game text-xs text-primary/70">
          ↳ The impostors are glowing now. Count them again.
        </p>
      )}

      <p className="text-muted-foreground/30 text-xs font-mono-game">
        Attempts: {attempts}
      </p>
    </motion.div>
  );
}
