import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Cryptogram floor (Type 5, Archives specialty) ──
// A banked phrase is hidden under a substitution cipher. The player reads the
// ciphertext and types back the plaintext. The puzzle is the SUBSTITUTION, not
// the phrase, so the phrases are deliberately familiar (proverbs, idioms,
// internet catchphrases).
//
// Vowel scaffold: the VOWELS are a fixed guide, never random — they map to the
// QWERTY top row (A->Q, E->W, I->E, O->R, U->T) and Y always stays Y. That key
// is shown on the floor, and each vowel is pre-filled beneath the ciphertext,
// exactly like a half-solved cryptogram. Only the consonants are scrambled, so
// the player always has a foothold to work from.
//
// No hard lock: after repeated misses the building also leaks consonant keys,
// then eventually the whole answer fades in.

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Fixed vowel map (plaintext -> cipher). Y is an intentional identity.
const VOWEL_MAP = { A: "Q", E: "W", I: "E", O: "R", U: "T", Y: "Y" };
// The cipher letters reserved as vowel images — a consonant can never land here.
const VOWEL_IMAGES = new Set(Object.values(VOWEL_MAP));
// Reverse, for decoding the scaffold: cipher letter -> plaintext vowel.
const CIPHER_TO_VOWEL = Object.fromEntries(
  Object.entries(VOWEL_MAP).map(([plain, cip]) => [cip, plain])
);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Vowels + Y are fixed; consonants get a random derangement over the remaining
// (non-vowel-image) cipher letters, with no consonant mapping to itself.
function makeCipher() {
  const map = { ...VOWEL_MAP };
  const consonants = [...UPPER].filter((ch) => !(ch in VOWEL_MAP));
  const available = [...UPPER].filter((ch) => !VOWEL_IMAGES.has(ch));
  let perm;
  do {
    perm = shuffle(available);
  } while (consonants.some((ch, i) => perm[i] === ch));
  consonants.forEach((ch, i) => (map[ch] = perm[i]));
  return map;
}

// Strip to letters+digits for grading — a decode only has to recover the glyphs,
// so punctuation and spacing are always forgiven.
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// A small, fixed worked example — its cipher obeys the same vowel key, so it
// doubles as a demonstration of the guide (W=E, Q=A, R=O, Y=Y all visible).
const EXAMPLE = { plain: "EASY COME EASY GO", cipher: "WQZY KRNW WQZY HR" };

// Split a cipher/plain string into words of per-character cells for the two-row
// display. For each cell: the cipher glyph on top, and beneath it the scaffold —
// the decoded vowel (a "given"), a blank for an unknown consonant, or a passed-
// through punctuation/space/digit.
function toCells(cipherText) {
  return cipherText.split(" ").map((word) =>
    word.split("").map((ch) => {
      if (VOWEL_IMAGES.has(ch)) return { top: ch, under: CIPHER_TO_VOWEL[ch], kind: "given" };
      if (/[A-Z]/.test(ch)) return { top: ch, under: "_", kind: "blank" };
      return { top: ch, under: ch, kind: "punct" };
    })
  );
}

function CipherBoard({ cipher, dense }) {
  const words = toCells(cipher);
  return (
    <div
      className="inline-flex flex-wrap gap-x-4 gap-y-3 font-mono-game select-none"
      style={{ fontSize: dense ? "clamp(13px, 3.4vw, 20px)" : "clamp(15px, 4vw, 24px)" }}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-flex" style={{ whiteSpace: "nowrap" }}>
          {word.map((cell, ci) => (
            <span key={ci} className="inline-flex flex-col items-center" style={{ width: "1.15em" }}>
              <span className="text-primary/90" style={{ lineHeight: 1.1 }}>{cell.top}</span>
              <span
                style={{
                  lineHeight: 1.1,
                  color:
                    cell.kind === "given" ? "hsl(43 96% 56%)" :
                    cell.kind === "punct" ? "hsl(158 10% 45%)" : "hsl(158 10% 38%)",
                  textShadow: cell.kind === "given" ? "0 0 8px hsl(43 96% 56% / 0.5)" : "none",
                }}
              >
                {cell.under}
              </span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

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
    const cipher = plain.split("").map((ch) => (map[ch] ? map[ch] : ch)).join("");

    // Consonant footholds ranked by frequency — vowels are already given, so the
    // assist only ever leaks the scrambled letters.
    const freq = {};
    for (const ch of plain) if (/[A-Z]/.test(ch) && !(ch in VOWEL_MAP)) freq[ch] = (freq[ch] || 0) + 1;
    const footholds = Object.keys(freq)
      .sort((a, b) => freq[b] - freq[a])
      .map((p) => ({ cipher: map[p], plain: p }));

    built.current = { plain, cipher, footholds };
  }
  const { plain, cipher, footholds } = built.current;

  // Anti-soft-lock: first consonant key at 4 misses, one more every 3 after.
  const revealCount =
    attempts >= 4 ? Math.min(footholds.length, 1 + Math.floor((attempts - 4) / 3)) : 0;
  const shownFootholds = footholds.slice(0, revealCount);
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
          Every letter is swapped for another, the same swap throughout. The{" "}
          <span className="text-accent">vowels are already given</span> — they never change (see
          the key). Crack the consonants and type the phrase.
        </p>
      </div>

      {/* Vowel key — the fixed guide */}
      <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
        <p className="text-accent glow-amber font-mono-game text-[10px] tracking-widest uppercase mb-2">
          ⚿ Vowel Key — always the same
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(VOWEL_MAP).map(([plain, cip]) => (
            <span
              key={plain}
              className="font-mono-game text-sm text-accent border border-accent/30 rounded px-2 py-1"
            >
              {plain} = {cip}
            </span>
          ))}
        </div>
      </div>

      {/* Worked example — a solved cryptogram in the same two-row format */}
      <div className="rounded-md border border-border/60 bg-black/20 p-3 space-y-1">
        <p className="text-muted-foreground font-mono-game text-[10px] tracking-widest uppercase">
          ◇ example (solved) — cipher on top, answer beneath
        </p>
        <CipherBoard cipher={EXAMPLE.cipher} dense />
        <p className="font-mono-game text-[11px] text-primary/50 tracking-wide pt-1">
          = {EXAMPLE.plain}
        </p>
      </div>

      {/* The puzzle — vowels pre-filled, consonants blank */}
      <div className="rounded-md border border-border bg-black/30 p-5 overflow-x-auto">
        <CipherBoard cipher={cipher} />
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

      {/* Consonant footholds — leaked after repeated misses, never a hard lock */}
      {shownFootholds.length > 0 && (
        <div className="space-y-1">
          <p className="font-mono-game text-xs text-primary/70 tracking-widest uppercase">
            ↳ leaked consonants
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
