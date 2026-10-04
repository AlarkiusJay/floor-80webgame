import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

// ── Cryptogram floor (Type 5, Archives specialty) ──
// A banked phrase is hidden under a cipher; the player fills the blanks with an
// on-screen keyboard (click or tap) — or, on desktop, their physical keyboard.
// Filling a letter PROPAGATES: every blank sharing that symbol fills at once,
// exactly like a newspaper cryptoquote. Two variants, one interaction:
//
//   "sub"      — letter substitution. The symbol under each blank is the cipher
//                letter. The Vowel Key (A->Q, E->W, I->E, O->R, U->T, Y->Y) is a
//                fixed decoder the player APPLIES — vowels start blank. Instead,
//                2-3 of the phrase's most common consonants are given to start.
//   "alphanum" — every letter is its alphabet position (A=1 … Z=26). The symbol
//                under each blank is that number; the vowels' numbers are given.
//
// No hard lock: the free Reveal fills + locks a letter whenever the player is
// stuck. A fully-filled wrong answer flags the bad symbols instead of trapping.

const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);
const VOWEL_MAP = { A: "Q", E: "W", I: "E", O: "R", U: "T", Y: "Y" }; // sub
const VOWEL_IMAGES = new Set(Object.values(VOWEL_MAP));
const VOWEL_NUM = { A: 1, E: 5, I: 9, O: 15, U: 21, Y: 25 }; // alphanum
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const numOf = (ch) => ch.charCodeAt(0) - 64; // 'A' -> 1 … 'Z' -> 26
const KEYROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Vowels + Y fixed; consonants deranged over the remaining cipher letters.
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

export default function CryptogramFloor({ floor, floorData, onAdvance }) {
  const variant = floorData.variant === "alphanum" ? "alphanum" : "sub";
  const isNum = variant === "alphanum";

  // ── Build the immutable puzzle model once per mount ──
  const model = useRef(null);
  if (!model.current) {
    const plain = floorData.phrase;
    const map = isNum ? null : makeCipher();
    const symbolOf = (ch) => (isNum ? String(numOf(ch)) : map[ch]);

    const cells = []; // { type: "letter"|"space"|"punct", id?, symbol?, answer?, char? }
    const answerForSymbol = {};
    const freq = {}; // symbol -> how many blanks carry it (for picking common letters)
    plain.split("").forEach((ch, i) => {
      if (ch === " ") return cells.push({ type: "space" });
      if (!/[A-Z]/.test(ch)) return cells.push({ type: "punct", char: ch });
      const symbol = symbolOf(ch);
      answerForSymbol[symbol] = ch;
      freq[symbol] = (freq[symbol] || 0) + 1;
      cells.push({ type: "letter", id: i, symbol, answer: ch });
    });

    const byId = {};
    const letterIds = [];
    cells.forEach((c) => {
      if (c.type === "letter") { byId[c.id] = c; letterIds.push(c.id); }
    });
    const distinctSymbols = [...new Set(letterIds.map((id) => byId[id].symbol))];

    // Starting scaffold differs by variant:
    //   alphanum — vowels are given (pre-filled + locked); the Vowel Key echoes them.
    //   sub      — vowels start BLANK (player decodes them with the Vowel Key); instead
    //              2-3 of the phrase's most common consonants are given as footholds.
    const initialGuesses = {};
    const startLocked = new Set();
    if (isNum) {
      distinctSymbols.forEach((s) => {
        if (VOWELS.has(answerForSymbol[s])) {
          initialGuesses[s] = answerForSymbol[s];
          startLocked.add(s);
        }
      });
    } else {
      const ranked = distinctSymbols
        .filter((s) => !VOWELS.has(answerForSymbol[s]))
        .map((s) => ({ s, f: freq[s], r: Math.random() }))
        .sort((a, b) => b.f - a.f || b.r - a.r) // most frequent first, random tiebreak
        .map((o) => o.s);
      const want = 2 + Math.floor(Math.random() * 2); // 2 or 3
      ranked.slice(0, Math.min(want, ranked.length)).forEach((s) => {
        initialGuesses[s] = answerForSymbol[s];
        startLocked.add(s);
      });
    }

    model.current = {
      plain, cells, byId, letterIds, answerForSymbol, initialGuesses,
      startLocked, distinctSymbols,
    };
  }
  const M = model.current;

  const editableFor = (locked) => M.letterIds.filter((id) => !locked.has(M.byId[id].symbol));
  const firstActive = editableFor(M.startLocked)[0] ?? null;

  // ── State + refs (refs let the global keydown handler read latest values) ──
  const [guesses, setGuessesState] = useState(M.initialGuesses);
  const [locked, setLockedState] = useState(M.startLocked);
  const [activeId, setActiveIdState] = useState(firstActive);
  const [wrong, setWrong] = useState(new Set());
  const [status, setStatus] = useState("idle"); // idle | correct
  const [attempts, setAttempts] = useState(0);

  const guessesRef = useRef(guesses);
  const lockedRef = useRef(locked);
  const activeRef = useRef(activeId);
  const statusRef = useRef(status);
  const wasComplete = useRef(false);
  statusRef.current = status;

  const setGuesses = (g) => { guessesRef.current = g; setGuessesState(g); };
  const setLocked = (l) => { lockedRef.current = l; setLockedState(l); };
  const setActive = (id) => { activeRef.current = id; setActiveIdState(id); };

  const lockedLetters = () => new Set([...lockedRef.current].map((s) => M.answerForSymbol[s]));

  // Next editable blank after `fromId` that's still empty (wraps); falls back to
  // the next editable blank regardless. Used for auto-advance after a fill.
  const nextEmpty = (fromId, g, lk) => {
    const ed = editableFor(lk);
    if (!ed.length) return null;
    const start = ed.indexOf(fromId);
    for (let k = 1; k <= ed.length; k++) {
      const cand = ed[(start + k + ed.length) % ed.length];
      if (!g[M.byId[cand].symbol]) return cand;
    }
    return ed[((start < 0 ? 0 : start) + 1) % ed.length];
  };

  const move = (dir) => {
    const ed = editableFor(lockedRef.current);
    if (!ed.length) return;
    let i = ed.indexOf(activeRef.current);
    if (i < 0) i = dir > 0 ? -1 : 0;
    setActive(ed[(i + dir + ed.length) % ed.length]);
  };

  const inputLetter = (L) => {
    if (statusRef.current === "correct") return;
    const id = activeRef.current;
    if (id == null) return;
    const sym = M.byId[id].symbol;
    if (lockedRef.current.has(sym)) return;
    if (lockedLetters().has(L)) return; // a given/revealed letter can't be reused
    const next = { ...guessesRef.current };
    for (const s of Object.keys(next)) if (next[s] === L && !lockedRef.current.has(s)) delete next[s];
    next[sym] = L;
    setGuesses(next);
    const nid = nextEmpty(id, next, lockedRef.current);
    if (nid != null) setActive(nid);
  };

  const clearActive = () => {
    if (statusRef.current === "correct") return;
    const id = activeRef.current;
    if (id == null) return;
    const sym = M.byId[id].symbol;
    if (lockedRef.current.has(sym)) return;
    const next = { ...guessesRef.current };
    delete next[sym];
    setGuesses(next);
  };

  const reveal = () => {
    if (statusRef.current === "correct") return;
    const ed = editableFor(lockedRef.current);
    if (!ed.length) return;
    const active = activeRef.current;
    const targetId = ed.includes(active) ? active : ed[0];
    const sym = M.byId[targetId].symbol;
    const L = M.answerForSymbol[sym];
    const next = { ...guessesRef.current };
    for (const s of Object.keys(next)) if (next[s] === L && !lockedRef.current.has(s)) delete next[s];
    next[sym] = L;
    setGuesses(next);
    const nl = new Set(lockedRef.current); nl.add(sym); setLocked(nl);
    const nid = nextEmpty(targetId, next, nl);
    if (nid != null) setActive(nid);
  };

  // ── Completion check ──
  useEffect(() => {
    const complete = M.distinctSymbols.every((s) => guesses[s]);
    if (!complete) { wasComplete.current = false; if (wrong.size) setWrong(new Set()); return; }
    const bad = M.distinctSymbols.filter((s) => guesses[s] !== M.answerForSymbol[s]);
    if (bad.length === 0) {
      if (statusRef.current !== "correct") {
        setStatus("correct");
        setTimeout(() => onAdvance(floorData.nextFloor), 900);
      }
    } else {
      setWrong(new Set(bad));
      if (!wasComplete.current) setAttempts((a) => a + 1);
      wasComplete.current = true;
    }
  }, [guesses]);

  // ── Physical keyboard (desktop) ──
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); inputLetter(e.key.toUpperCase()); }
      else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); clearActive(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Render helpers ──
  const lockedLettersNow = lockedLetters();
  const cellW = isNum ? "1.8em" : "1.35em";

  // group cells into words so a word never wraps mid-blank
  const words = [];
  let cur = [];
  for (const c of M.cells) {
    if (c.type === "space") { if (cur.length) words.push(cur); cur = []; }
    else cur.push(c);
  }
  if (cur.length) words.push(cur);

  const renderCell = (c, k) => {
    if (c.type === "punct") {
      return (
        <span key={k} className="inline-flex flex-col items-center justify-end font-mono-game"
          style={{ fontSize: "clamp(18px, 5vw, 30px)", color: "hsl(158 10% 55%)" }}>
          <span style={{ lineHeight: 1 }}>{c.char}</span>
          <span style={{ height: "1.3em" }} />
        </span>
      );
    }
    const g = guesses[c.symbol] || "";
    const isLocked = locked.has(c.symbol);
    const isActive = activeId === c.id && !isLocked;
    const isWrong = wrong.has(c.symbol);
    const topColor = isWrong ? "hsl(0 72% 58%)" : isLocked ? "hsl(43 96% 56%)" : "hsl(158 64% 60%)";
    const lineColor = isWrong ? "hsl(0 72% 51%)" : isActive ? "hsl(158 64% 52%)" : "hsl(158 15% 40%)";
    return (
      <button
        key={k}
        type="button"
        onClick={() => !isLocked && setActive(c.id)}
        className="inline-flex flex-col items-center font-mono-game"
        style={{
          width: cellW, cursor: isLocked ? "default" : "pointer",
          background: isActive ? "hsl(158 64% 52% / 0.14)" : "transparent",
          borderRadius: 4, padding: "2px 0",
        }}
      >
        <span style={{ fontSize: "clamp(18px, 5vw, 30px)", lineHeight: 1, color: topColor,
          textShadow: isLocked ? "0 0 8px hsl(43 96% 56% / 0.4)" : "none", minHeight: "1em" }}>
          {g || " "}
        </span>
        <span style={{ height: 2, width: "78%", background: lineColor, margin: "2px 0 3px" }} />
        <span style={{ fontSize: "clamp(10px, 2.6vw, 13px)", lineHeight: 1, color: "hsl(158 12% 48%)" }}
          className="tabular-nums">
          {c.symbol}
        </span>
      </button>
    );
  };

  const KeyBtn = ({ label, onPress, wide, given }) => (
    <button
      type="button"
      onClick={onPress}
      disabled={given}
      className="font-mono-game rounded border transition-colors select-none"
      style={{
        flex: wide ? "1.6 1 0" : "1 1 0",
        minWidth: 0, padding: "10px 0", fontSize: "clamp(13px, 3.6vw, 17px)",
        color: given ? "hsl(43 96% 56%)" : "hsl(158 30% 80%)",
        borderColor: given ? "hsl(43 96% 56% / 0.4)" : "hsl(158 20% 30%)",
        background: given ? "hsl(43 96% 56% / 0.08)" : "hsl(158 20% 12%)",
        cursor: given ? "default" : "pointer",
        opacity: given ? 0.9 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-5"
    >
      {/* Pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ⧉ Cryptogram
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest uppercase">
          {isNum ? "AlphaNum — letters as 1–26" : "decode the substitution"}
        </span>
      </div>

      {/* Instruction */}
      <div className="terminal-border rounded-md p-4">
        {isNum ? (
          <p className="text-foreground/90 font-mono-game text-sm leading-relaxed">
            Each letter is its spot in the alphabet (A=1 … Z=26). Pick a blank, then tap a key —
            every blank with the same number fills together. The{" "}
            <span className="text-accent">vowels are already placed</span>. On desktop you can type,
            use ← →, and Backspace.
          </p>
        ) : (
          <p className="text-foreground/90 font-mono-game text-sm leading-relaxed">
            Every letter is swapped for another, the same swap throughout. A few{" "}
            <span className="text-accent">consonants are filled in</span> to start — use the Vowel Key
            below to crack the rest. Pick a blank, then tap a key; every blank with the same symbol
            fills together. On desktop you can type, use ← →, and Backspace.
          </p>
        )}
      </div>

      {/* Vowel key */}
      <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
        <p className="text-accent glow-amber font-mono-game text-[10px] tracking-widest uppercase mb-2">
          {isNum ? "⚿ Vowel Key — alphabet numbers" : "⚿ Vowel Key — always the same"}
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(isNum ? VOWEL_NUM : VOWEL_MAP).map(([ltr, v]) => (
            <span key={ltr} className="font-mono-game text-sm text-accent border border-accent/30 rounded px-2 py-1">
              {ltr} = {v}
            </span>
          ))}
        </div>
      </div>

      {/* Puzzle board */}
      <div className="rounded-md border border-border bg-black/30 p-4 overflow-x-auto">
        <div className="flex flex-wrap gap-x-4 gap-y-4">
          {words.map((word, wi) => (
            <span key={wi} className="inline-flex" style={{ whiteSpace: "nowrap" }}>
              {word.map((c, ci) => renderCell(c, ci))}
            </span>
          ))}
        </div>
      </div>

      {/* Status */}
      {status === "correct" ? (
        <p className="text-primary glow-green font-mono-game text-sm">✓ Cipher broken. Advancing...</p>
      ) : wrong.size > 0 ? (
        <p className="text-destructive font-mono-game text-sm">✗ All filled, but some are off — the red ones don&apos;t fit.</p>
      ) : (
        <p className="text-muted-foreground font-mono-game text-xs">Fill every blank to lock it in.</p>
      )}

      {/* On-screen keyboard */}
      <div className="space-y-1.5 select-none">
        {KEYROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1" style={{ padding: ri === 1 ? "0 4%" : 0 }}>
            {row.split("").map((k) => (
              <KeyBtn key={k} label={k} given={lockedLettersNow.has(k)} onPress={() => inputLetter(k)} />
            ))}
          </div>
        ))}
        <div className="flex gap-1 pt-1">
          <KeyBtn label="◀" onPress={() => move(-1)} />
          <KeyBtn label="⌫" onPress={clearActive} />
          <KeyBtn label="🔍 Reveal" wide onPress={reveal} />
          <KeyBtn label="▶" onPress={() => move(1)} />
        </div>
      </div>

      <p className="text-muted-foreground/30 text-xs font-mono-game">Attempts: {attempts}</p>
    </motion.div>
  );
}
