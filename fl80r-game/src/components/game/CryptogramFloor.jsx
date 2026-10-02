import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Cryptogram floor (Type 5, Archives specialty) ──
// A banked phrase is hidden under a random letter-substitution cipher. The player
// reads the ciphertext and types back the plaintext. The puzzle is the SUBSTITUTION,
// not the phrase — so the phrases are deliberately familiar (proverbs, idioms,
// internet catchphrases). Spaces and apostrophes stay visible as solving aids,
// exactly like a real cryptogram app.
//
// No mercy, but no hard lock: after enough misses the building leaks letter
// footholds (cipher → plain), and eventually the whole answer fades in so a stuck
// player is never trapped.

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// A random derangement of the alphabet — no letter maps to itself (contract rule).
function makeCipher() {
  const base = UPPER.split("");
  let perm;
  do {
    perm = [...base];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
  } while (perm.some((ch, i) => ch === base[i]));
  const map = {};
  base.forEach((ch, i) => (map[ch] = perm[i]));
  return map;
}

// Strip to letters+digits for grading — a decode only has to recover the glyphs,
// so punctuation and spacing are always forgiven.
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function CryptogramFloor({ floor, floorData, onAdvance }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [attempts, setAttempts] = useState(0);

  // Roll the cipher + ciphertext once per mount (stable across re-renders; a page
  // refresh regenerates the whole run, which re-rolls it).
  const built = useRef(null);
  if (!built.current) {
    const plain = floorData.phrase;
    const map = makeCipher();
    const cipher = plain
      .split("")
      .map((ch) => (map[ch] ? map[ch] : ch))
      .join("");

    // Plaintext letters ranked by frequency — the most useful footholds first.
    const freq = {};
    for (const ch of plain) if (/[A-Z]/.test(ch)) freq[ch] = (freq[ch] || 0) + 1;
    const rankedPlain = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    const footholds = rankedPlain.map((p) => ({ cipher: map[p], plain: p }));

    built.current = { plain, cipher, footholds };
  }
  const { plain, cipher, footholds } = built.current;

  // Anti-soft-lock escalation: first foothold at 4 misses, one more every 3 after.
  const revealCount =
    attempts >= 4 ? Math.min(footholds.length, 1 + Math.floor((attempts - 4) / 3)) : 0;
  const shownFootholds = footholds.slice(0, revealCount);
  // Full answer fades in once the climb gets punishing.
  const answerOpacity = attempts >= 12 ? Math.min(0.75, (attempts - 11) * 0.09) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (norm(input) === norm(plain)) {
      setStatus("correct");
      setTimeout(() => onAdvance(floorData.nextFloor), 900);
      return;
    }
    setStatus("wrong");
    setInput("");
    setAttempts((a) => a + 1);
    setTimeout(() => setStatus("idle"), 1400);
  };

  // Render the ciphertext word-by-word so word breaks (and apostrophes) stay
  // legible — the structure is itself a solving aid.
  const words = cipher.split(" ");

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ⧉ Cryptogram
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest uppercase">
          decode the substitution
        </span>
      </div>

      {/* Instruction */}
      <div className="terminal-border rounded-md p-5">
        <p className="text-foreground/90 font-mono-game text-sm leading-relaxed">
          The building wrote this in its own hand — every letter swapped for another,
          the same swap throughout.
          <br />
          Crack the cipher and type the phrase it hides.
        </p>
      </div>

      {/* Ciphertext wall */}
      <div className="rounded-md border border-border bg-black/30 p-5 overflow-x-auto">
        <div
          className="inline-flex flex-wrap gap-x-5 gap-y-3 font-mono-game text-primary/90 select-none"
          style={{ fontSize: "clamp(16px, 4.6vw, 28px)", letterSpacing: "0.22em" }}
        >
          {words.map((w, wi) => (
            <span key={wi} className="whitespace-nowrap">
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game block">
          Type the decoded phrase.
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="decode it..."
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
              ✓ Cipher broken. Advancing...
            </motion.p>
          )}
          {status === "wrong" && (
            <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-destructive font-mono-game text-sm">
              ✗ Not the phrase. The swap holds.
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {/* Letter footholds — leaked after repeated misses, never a hard lock */}
      {shownFootholds.length > 0 && (
        <div className="space-y-1">
          <p className="font-mono-game text-xs text-primary/70 tracking-widest uppercase">
            ↳ leaked keys
          </p>
          <div className="flex flex-wrap gap-2">
            {shownFootholds.map((f, i) => (
              <span
                key={i}
                className="font-mono-game text-sm text-primary border border-primary/30 rounded px-2 py-1"
              >
                {f.cipher} = {f.plain}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full answer bleeds through once the climb gets cruel */}
      <p
        className="font-mono-game text-xs text-primary transition-all duration-1000"
        style={{ opacity: answerOpacity, userSelect: answerOpacity > 0 ? "text" : "none" }}
      >
        ↳ {plain}
      </p>

      <p className="text-muted-foreground/30 text-xs font-mono-game">
        Attempts: {attempts}
      </p>
    </motion.div>
  );
}
