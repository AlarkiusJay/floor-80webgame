// Related words per floor — if a player types one of these, they're "warm"
// Key = floor number, Value = array of related/synonym words (lowercase)

export const RELATED_WORDS = {
  2:  ["atlas", "chart", "plan", "globe", "diagram", "blueprint", "layout", "cartography"],
  4:  ["cloth", "rag", "fabric", "sponge", "wipe", "towels", "linen", "dry"],
  6:  ["steps", "feet", "tracks", "prints", "stride", "walk", "pace", "footprint", "step"],
  8:  ["sound", "noise", "reverb", "reverberation", "resonance", "bounce", "repeat"],
  10: ["cold", "frozen", "frost", "snow", "freeze", "water", "glacier", "cool"],
  12: ["weight", "mass", "heavy", "kilogram", "gram", "tonne", "pound"],
  14: ["keys", "computer", "typing", "type", "laptop", "keypad", "board"],
  16: ["dark", "night", "shadow", "black", "void", "dim", "gloom", "dusk"],
  18: ["penny", "quarter", "dime", "money", "cash", "currency", "change", "heads", "tails"],
  20: ["book", "books", "bookshelf", "shelves", "shelf", "archive", "knowledge", "tree"],
  22: ["clock", "watch", "hours", "minutes", "seconds", "pass", "passing", "age", "years"],
  24: ["prank", "humor", "funny", "riddle", "jest", "pun", "comedy", "laugh"],
  26: ["stream", "creek", "water", "flow", "lake", "ocean", "sea", "current", "brook"],
  28: ["coffee", "teabag", "brewing", "brew", "steep", "bag", "drink", "herbal"],
  30: ["quiet", "peace", "still", "hush", "mute", "calm", "tranquil", "noiseless"],
  32: ["shorter", "shorter word", "length", "brief", "tiny", "small", "abbreviated"],
  34: ["casket", "burial", "grave", "tomb", "box", "sarcophagus", "funeral", "caskets"],
  36: ["cards", "playing cards", "card", "pack", "deck", "hearts", "spades", "clubs", "diamonds"],
  38: ["jar", "flask", "container", "vessel", "jug", "cap", "neck", "glass"],
  40: ["kettle", "pot", "tea kettle", "cup", "mug", "brew", "hot", "spout"],
  42: ["pen", "graphite", "writing", "draw", "sketch", "lead", "crayon"],
  44: ["equal", "both", "neither", "identical", "balanced", "equivalent"],
  46: ["pit", "cavity", "gap", "ditch", "opening", "tunnel", "crater", "void"],
  48: ["watch", "timer", "hourglass", "dial", "hands", "time", "tick"],
  50: ["flame", "blaze", "heat", "burn", "candle", "ember", "spark", "torch"],
  52: ["sunshine", "glow", "brightness", "illumination", "lamp", "shine", "radiance"],
  54: ["breathe", "air", "inhale", "exhale", "breathing", "lungs", "oxygen"],
  56: ["cloth", "rag", "linen", "fabric", "dry", "wipe", "towels"],
  58: ["brush", "hairbrush", "toothbrush", "rake", "teeth", "hair"],
  60: ["tomorrow", "ahead", "coming", "next", "destiny", "fate", "horizon"],
  62: ["flame", "blaze", "heat", "burn", "spark", "ember", "inferno"],
  64: ["flu", "cough", "virus", "illness", "sick", "sneeze", "fever", "infection"],
  66: ["die", "dying", "mortality", "end", "passing", "demise", "decease", "dead"],
  68: ["1023", "2130", "3012", "2031", "zero", "zeros", "number", "digits"],
  70: ["sound", "noise", "reverb", "bounce", "repeat", "resonance", "reverberation"],
  72: ["atlas", "chart", "globe", "plan", "diagram", "cartography", "navigate"],
  74: ["mystery", "hidden", "private", "confidential", "whisper", "unknown", "surprise"],
  76: ["wall", "border", "gate", "barrier", "boundary", "hedge", "enclosure"],
  78: ["pin", "pin cushion", "sewing", "thread", "stitch", "thimble", "sew"],
};

/**
 * Returns true if the guess is "close" to the correct answer.
 * Checks:
 * 1. relatedWords list for this floor
 * 2. Guess is a substring of the answer or vice versa (min 3 chars)
 * 3. Character-level similarity > 60% (Jaccard)
 */
export function isCloseGuess(guess, answer, floorNum) {
  const g = guess.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  if (!g || g === a) return false;

  // 1. Check related words
  const related = RELATED_WORDS[floorNum] || [];
  if (related.includes(g)) return true;

  // 2. Substring check (only meaningful if length >= 3)
  if (g.length >= 3 && (a.includes(g) || g.includes(a))) return true;

  // 3. Jaccard similarity on character bigrams
  const bigrams = (str) => {
    const set = new Set();
    for (let i = 0; i < str.length - 1; i++) set.add(str[i] + str[i + 1]);
    return set;
  };
  const bg = bigrams(g);
  const ba = bigrams(a);
  if (bg.size === 0 || ba.size === 0) return false;
  const intersection = [...bg].filter(x => ba.has(x)).length;
  const union = new Set([...bg, ...ba]).size;
  return intersection / union > 0.5;
}