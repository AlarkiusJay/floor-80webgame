// Tiered hints for logic riddles. Every HINT_EVERY wrong attempts a new hint
// spawns. Hints before the last one are obscured (letters really replaced, not
// just blurred); the last one is readable and close to the answer.

export const HINT_EVERY = 10;
export const HINT_STAGES = 3;

const MASK = "▒";

// Deterministic string hash -> 0..2^32 so masks don't reshuffle on re-render.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Replace roughly `ratio` of the letters/digits with a mask glyph.
export function obscure(text, ratio, seed = text) {
  let s = hash(String(seed)) || 1;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  return Array.from(text)
    .map((ch) => (/[\p{L}\p{N}]/u.test(ch) && rand() < ratio ? MASK : ch))
    .join("");
}

// Underscore every letter except the first of each word (if `showFirst`) and
// every `revealEvery`-th letter (0 = none).
function skeleton(answer, revealEvery, showFirst = true) {
  return answer
    .split(" ")
    .map((word) =>
      Array.from(word)
        .map((ch, i) => {
          if (!/[\p{L}\p{N}]/u.test(ch)) return ch;
          return (showFirst && i === 0) || (revealEvery && i % revealEvery === 0) ? ch : "_";
        })
        .join("")
    )
    .join("  ");
}

// The canonical answer sometimes carries an explanation after a dash.
function core(answer) {
  return String(answer).split(/\s+[-–—]\s+/)[0];
}

// Returns the hint to show at `stage` (1..HINT_STAGES), or null.
// { text, obscured }
export function logicHint(stage, { hint, answer }) {
  const seed = `${answer}`;
  if (stage <= 0) return null;
  if (stage === 1 && hint) {
    return { text: obscure(hint, 0.45, seed + "1"), obscured: true };
  }
  if (stage <= 2) {
    // Shape of the answer only (word lengths), no letters, still hazy.
    return { text: skeleton(core(answer), 0, false), obscured: true };
  }
  // Final hint: readable, every other letter of the answer revealed.
  return { text: skeleton(core(answer), 2), obscured: false };
}
