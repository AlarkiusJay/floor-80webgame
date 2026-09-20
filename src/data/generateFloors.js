import { TYPED_RIDDLES, MATH_RIDDLES, HIDDEN_RIDDLES, CHASE_RIDDLES } from "./riddleBank.js";
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

// Memory floor floors (5 of them in non-boss floors)
const MEMORY_FLOOR_POSITIONS = [25, 45, 55, 68, 77];

// Circuit puzzle floors appear right before each boss (floors 9, 19, 29, 39, 49, 59, 69)
const CIRCUIT_FLOOR_POSITIONS = new Set([9, 19, 29, 39, 49, 59, 69]);

export function generateFloors() {
  // Shuffle riddle pools
  const typedPool  = shuffle(TYPED_RIDDLES);
  const mathPool   = shuffle(MATH_RIDDLES);
  const hiddenPool = shuffle(HIDDEN_RIDDLES);
  const chasePool  = shuffle(CHASE_RIDDLES);

  let typedIdx  = 0;
  let mathIdx   = 0;
  let hiddenIdx = 0;
  let chaseIdx  = 0;

  // We'll collect all floor answers as we generate, so memory floors can reference them
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

    // Memory floors: reference a previously generated floor's answer
    if (MEMORY_FLOOR_POSITIONS.includes(f)) {
      // Pick a past non-boss floor that has an answer
      const pastFloors = Object.keys(floorAnswers).map(Number).filter(n => n < f);
      const refFloor = pastFloors.length > 0
        ? pastFloors[Math.floor(Math.random() * pastFloors.length)]
        : null;

      // Pick a new riddle for the second part
      const secondRiddle = typedPool[typedIdx % typedPool.length];
      typedIdx++;

      result[f] = {
        ...meta,
        type: "typed",
        bg,
        nextFloor,
        description: refFloor
          ? `A mysterious figure steps forward.\n\n'You've come far. Tell me — on Floor ${refFloor}, what was the answer?'`
          : `A mysterious figure steps forward.\n\n'Impressive. Solve this riddle to continue:\n\n${secondRiddle.description}'`,
        clue: refFloor
          ? `What did you answer on Floor ${refFloor}?`
          : secondRiddle.clue,
        memoryFloor: refFloor || undefined,
        memoryAnswer: refFloor ? floorAnswers[refFloor] : undefined,
        secondRiddle: refFloor ? {
          description: secondRiddle.description,
          clue: secondRiddle.clue,
          answer: secondRiddle.answer,
        } : undefined,
        answer: refFloor ? undefined : secondRiddle.answer,
      };

      if (!refFloor) {
        floorAnswers[f] = secondRiddle.answer;
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
      const riddle = mathPool[mathIdx % mathPool.length];
      mathIdx++;
      result[f] = {
        ...meta,
        type: "math",
        bg,
        nextFloor,
        description: riddle.description,
        clue: riddle.clue,
        hint: riddle.hint,
        answer: riddle.answer,
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

  return result;
}