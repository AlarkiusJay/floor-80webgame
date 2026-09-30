import { TYPED_RIDDLES, HIDDEN_RIDDLES, CHASE_RIDDLES } from "./riddleBank.js";
import { STORY_MATH_RIDDLES, CHAIN_SAFE_RIDDLES } from "./storyMathRiddles.js";
import { clockAnswer } from "@/lib/answers.js";
import { FLOORS as STATIC_FLOORS } from "./floors.js";

// ─────────────────────────────────────────────
// STATIC BOSS FLOORS — never randomized
// ─────────────────────────────────────────────
const BOSS_FLOORS = new Set([10, 20, 30, 40, 50, 60, 70, 80]);

// Section background colors per zone
const ZONE_BGS = {
  "1-10":  ["#0a0f0d","#0a0d14","#0d0a0a","#0a0a0e","#0b0b09","#090e0e","#0e090e","#0a0e0a","#0c0c0a"],
  "11-20": ["#08100f","#100808","#0a0810","#080f0a","#100f08","#0f0810","#08100c","#100a08","#0c0c10"],
  "21-30": ["#0a0a0a","#090f09","#0f0909","#090a0f","#0a0f0a","#0f0a09","#09090f","#0a0f0d","#0f0f09"],
  "31-40": ["#08080e","#0e0808","#080e08","#0c0a0e","#0e0e08","#0a0e0c","#0e080e","#080e0e","#0e0c08"],
  "41-50": ["#05050f","#05080a","#080510","#060a08","#0a0608","#080a06","#060608","#090806","#060909"],
  "51-60": ["#060405","#040606","#060406","#050504","#040505","#060405","#050604","#050505","#060606"],
  "61-70": ["#030810","#030a08","#070305","#050306","#030607","#070506","#030507","#060305","#070308"],
  "71-79": ["#020205","#030203","#020303","#040203","#020204","#030302","#030202","#040202","#020303"],
};

function getZoneBg(floorNum) {
  let zone, idx;
  if (floorNum <= 10)  { zone = "1-10";  idx = floorNum - 1; }
  else if (floorNum <= 20) { zone = "11-20"; idx = floorNum - 11; }
  else if (floorNum <= 30) { zone = "21-30"; idx = floorNum - 21; }
  else if (floorNum <= 40) { zone = "31-40"; idx = floorNum - 31; }
  else if (floorNum <= 50) { zone = "41-50"; idx = floorNum - 41; }
  else if (floorNum <= 60) { zone = "51-60"; idx = floorNum - 51; }
  else if (floorNum <= 70) { zone = "61-70"; idx = floorNum - 61; }
  else                     { zone = "71-79"; idx = floorNum - 71; }
  const bgs = ZONE_BGS[zone] || ["#0a0f0d"];
  return bgs[idx % bgs.length];
}

function getSectionMeta(floorNum) {
  if (floorNum <= 10)  return { section: "Floors 1-10",  sectionTitle: "The Lobby" };
  if (floorNum <= 20)  return { section: "Floors 11-20", sectionTitle: "The Archives" };
  if (floorNum <= 30)  return { section: "Floors 21-30", sectionTitle: "The Machine Room" };
  if (floorNum <= 40)  return { section: "Floors 31-40", sectionTitle: "The Labyrinth" };
  if (floorNum <= 50)  return { section: "Floors 41-50", sectionTitle: "The Observatory" };
  if (floorNum <= 60)  return { section: "Floors 51-60", sectionTitle: "The Crypts" };
  if (floorNum <= 70)  return { section: "Floors 61-70", sectionTitle: "The Glass Tower" };
  return { section: "Floors 71-79", sectionTitle: "The Final Ascent" };
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick n unique items from array
function pickN(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Fixed memory-floor chain. Each memory floor consumes an integer answer the
// player earned at an earlier, force-spawned "source" math floor.
//   kind "recall" -> re-enter the number you carried up.
//   kind "clock"  -> add the carried minutes to a base time.
// Source floors are math-pattern floors (the "…4" in each 9-floor zone), placed
// far enough ahead to satisfy the gap (floor 45: >=13; floor 77: >=40).
const MEMORY_CHAIN = [
  { floor: 25, source: 14, kind: "recall" },
  { floor: 45, source: 24, kind: "clock", baseHH: 22, baseMM: 0 },
  { floor: 55, source: 44, kind: "recall" },
  { floor: 68, source: 54, kind: "recall" },
  { floor: 77, source: 34, kind: "clock", baseHH: 20, baseMM: 17 },
];
const MEMORY_FLOORS = new Set(MEMORY_CHAIN.map((m) => m.floor));
const SOURCE_FLOORS = new Set(MEMORY_CHAIN.map((m) => m.source));

// Circuit puzzle floors appear right before each boss (floors 9, 19, 29, 39, 49, 59, 69)
const CIRCUIT_FLOOR_POSITIONS = new Set([9, 19, 29, 39, 49, 59, 69]);

export function generateFloors() {
  // Shuffle riddle pools
  const typedPool  = shuffle(TYPED_RIDDLES);
  const hiddenPool = shuffle(HIDDEN_RIDDLES);
  const chasePool  = shuffle(CHASE_RIDDLES);

  const tierForFloor = (f) => (f <= 25 ? 1 : f <= 55 ? 2 : 3);

  // Assign each memory chain a distinct chain-safe source riddle, preferring the
  // source floor's tier. Clock chains keep the carried minutes sane (<= 200).
  const usedSourceIds = new Set();
  const pickSource = (sourceFloor, clock) => {
    const tier = tierForFloor(sourceFloor);
    const ok = (r) =>
      !usedSourceIds.has(r.id) && (!clock || (r.chainValue >= 1 && r.chainValue <= 200));
    const pools = [
      shuffle(CHAIN_SAFE_RIDDLES.filter((r) => r.tier === tier)),
      shuffle(CHAIN_SAFE_RIDDLES),
    ];
    for (const pool of pools) {
      const found = pool.find(ok);
      if (found) { usedSourceIds.add(found.id); return found; }
    }
    const any = CHAIN_SAFE_RIDDLES.find((r) => !usedSourceIds.has(r.id)) || CHAIN_SAFE_RIDDLES[0];
    usedSourceIds.add(any.id);
    return any;
  };
  const sourceByFloor = {}; // source floor -> chosen riddle
  const memoryByFloor = {}; // memory floor -> { spec, src }
  for (const spec of MEMORY_CHAIN) {
    const src = pickSource(spec.source, spec.kind === "clock");
    sourceByFloor[spec.source] = src;
    memoryByFloor[spec.floor] = { spec, src };
  }

  // Story-math pools per tier (excluding riddles already claimed as sources so a
  // run never shows the same riddle twice).
  const mathTiers = {
    1: shuffle(STORY_MATH_RIDDLES.filter((r) => r.tier === 1 && !usedSourceIds.has(r.id))),
    2: shuffle(STORY_MATH_RIDDLES.filter((r) => r.tier === 2 && !usedSourceIds.has(r.id))),
    3: shuffle(STORY_MATH_RIDDLES.filter((r) => r.tier === 3 && !usedSourceIds.has(r.id))),
  };
  const mathIdxByTier = { 1: 0, 2: 0, 3: 0 };

  let typedIdx  = 0;
  let hiddenIdx = 0;
  let chaseIdx  = 0;

  // Collected answers (unused by the new memory chain, kept for possible refs)
  const floorAnswers = {}; // floorNum -> answer string

  // Decide floor type assignment for non-boss, non-memory floors
  // Pattern (repeating for each zone): hidden, typed, hidden, math, hidden, chase, hidden, typed, hidden
  const PATTERN = ["hidden", "typed", "hidden", "math", "hidden", "chase", "hidden", "typed", "hidden"];

  const result = {};

  for (let f = 1; f <= 80; f++) {
    // Always use static data for boss floors and floor 80
    if (BOSS_FLOORS.has(f)) {
      result[f] = { ...STATIC_FLOORS[f] };
      continue;
    }

    const meta = getSectionMeta(f);
    const bg = getZoneBg(f);
    const nextFloor = f + 1;

    // Circuit puzzle floors — right before each boss
    if (CIRCUIT_FLOOR_POSITIONS.has(f)) {
      result[f] = {
        ...meta,
        type: "circuit",
        bg: getZoneBg(f),
        nextFloor: f + 1,
      };
      continue;
    }

    // Fixed memory floors: consume the number earned at an earlier source floor.
    if (MEMORY_FLOORS.has(f)) {
      const { spec, src } = memoryByFloor[f];
      const carried = src.chainValue;
      const base = { ...meta, bg, nextFloor, type: "memory", sourceFloor: spec.source, carried };

      if (spec.kind === "clock") {
        const { accepts, display } = clockAnswer(spec.baseHH, spec.baseMM, carried);
        const baseLabel = clockAnswer(spec.baseHH, spec.baseMM, 0).display;
        result[f] = f === 45
          ? {
              ...base, kind: "clock", accepts, answer: display,
              description: `It is night, and the building has locked its memory around you.\n\nSteven is late - caught past the ${baseLabel} curfew. He crossed the lobby the exact number of minutes you carried up from Floor ${spec.source} late.\n\nWhat time did Steven finally slink in?`,
              clue: "Enter the time (e.g. 11:03 PM).",
              hint: `${baseLabel} + ${carried} minutes = ${display}.`,
            }
          : {
              ...base, kind: "clock", accepts, answer: display,
              description: `The tower's midnight screening of "Once Upon a Time in Hollywood (2019)" began at ${baseLabel}.\n\nIt ran the exact number of minutes you carried up from Floor ${spec.source}. When did the credits finally roll?`,
              clue: "Enter the time (e.g. 11:29 PM).",
              hint: `${baseLabel} + ${carried} minutes = ${display}.`,
            };
      } else {
        result[f] = {
          ...base, kind: "recall",
          description: `A figure blocks the stairwell, palm out.\n\n"Back on Floor ${spec.source}, you solved a riddle and I told you to keep the number. Prove it - what number did you carry?"`,
          clue: "Enter the number you answered on that floor.",
          accepts: src.accepts,
          answer: src.answer,
          hint: `The answer you gave on Floor ${spec.source} was ${src.answer}.`,
        };
      }
      continue;
    }

    // Zone-relative index for pattern
    let zoneOffset;
    if (f <= 9) zoneOffset = f - 1;
    else if (f <= 19) zoneOffset = f - 11;
    else if (f <= 29) zoneOffset = f - 21;
    else if (f <= 39) zoneOffset = f - 31;
    else if (f <= 49) zoneOffset = f - 41;
    else if (f <= 59) zoneOffset = f - 51;
    else if (f <= 69) zoneOffset = f - 61;
    else zoneOffset = f - 71;

    const floorType = PATTERN[zoneOffset % PATTERN.length];

    if (floorType === "typed") {
      const riddle = typedPool[typedIdx % typedPool.length];
      typedIdx++;
      result[f] = {
        ...meta,
        type: "typed",
        bg,
        nextFloor,
        description: riddle.description,
        clue: riddle.clue,
        answer: riddle.answer,
      };
      floorAnswers[f] = riddle.answer;

    } else if (floorType === "math") {
      // Source floors serve the pre-assigned chain-safe riddle plus the
      // "remember" line; every other math floor draws from its tier pool.
      let riddle;
      let remember = false;
      if (SOURCE_FLOORS.has(f)) {
        riddle = sourceByFloor[f];
        remember = true;
      } else {
        const tier = tierForFloor(f);
        const pool = mathTiers[tier];
        riddle = pool[mathIdxByTier[tier]++ % pool.length];
      }
      result[f] = {
        ...meta,
        type: "math",
        bg,
        nextFloor,
        story: true,
        description: remember
          ? `${riddle.description}\n\n> Keep the number. The building keeps grudges; you keep answers.`
          : riddle.description,
        clue: "Story Riddle - enter your answer (digits or words).",
        hint: riddle.hint,
        answer: riddle.answer,
        accepts: riddle.accepts,
      };
      floorAnswers[f] = riddle.answer;

    } else if (floorType === "chase") {
      const riddle = chasePool[chaseIdx % chasePool.length];
      chaseIdx++;
      result[f] = {
        ...meta,
        type: "chase",
        bg,
        nextFloor,
        description: riddle.description,
        clue: riddle.clue,
        hint: riddle.hint,
        answer: riddle.answer,
        chaseEmoji: riddle.chaseEmoji,
        chaseLabel: riddle.chaseLabel,
      };
      floorAnswers[f] = riddle.answer;

    } else {
      // hidden
      const riddle = hiddenPool[hiddenIdx % hiddenPool.length];
      hiddenIdx++;
      result[f] = {
        ...meta,
        type: "hidden",
        bg,
        nextFloor,
        description: riddle.description,
        clue: riddle.clue,
        hiddenText: riddle.hiddenText,
        hiddenColor: riddle.hiddenColor,
      };
    }
  }

  // Copy any static half-floor interludes (e.g. "40.5", "60.5") verbatim.
  // The main loop only builds integer floors 1–80, so these fixed bonus
  // floors — reached via a boss floor's nextFloor — must be added explicitly.
  for (const key of Object.keys(STATIC_FLOORS)) {
    if (!(key in result)) {
      result[key] = { ...STATIC_FLOORS[key] };
    }
  }

  return result;
}