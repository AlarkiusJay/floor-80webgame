import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSfx } from "@/lib/music";

const WOOF_SFX = "/audio/woof-vfx.mp3";
const MEOW_SFX = "/audio/meow.mp3"; // easter egg: click the cat

// Birds (L2). Bird 1 faces left, Bird 2 faces right. Each has idle-blink and
// angry frame pairs. Flyover frames are the top-down flap for the revenge phase.
const BIRDS = {
  L: {
    blink: ["/catmaze/birds/bird-L-blink1.png", "/catmaze/birds/bird-L-blink2.png"],
    angry: ["/catmaze/birds/bird-L-angry1.png", "/catmaze/birds/bird-L-angry2.png"],
  },
  R: {
    blink: ["/catmaze/birds/bird-R-blink1.png", "/catmaze/birds/bird-R-blink2.png"],
    angry: ["/catmaze/birds/bird-R-angry1.png", "/catmaze/birds/bird-R-angry2.png"],
  },
};
const WOOF_RADIUS = 4; // scares birds in a 9x9 square around the dog (Chebyshev 4)
// The four flyover sprites are DIRECTIONAL poses (head points NE/SE/SW/NW),
// not animation frames — a bird flies straight in its pose's direction.
const FLYOVER_DIRS = [
  { dx: 1, dy: -1, src: "/catmaze/birds/bird-flyover1.png" }, // NE (head top-right)
  { dx: 1, dy: 1, src: "/catmaze/birds/bird-flyover2.png" },  // SE (head bottom-right)
  { dx: -1, dy: 1, src: "/catmaze/birds/bird-flyover3.png" }, // SW (head bottom-left)
  { dx: -1, dy: -1, src: "/catmaze/birds/bird-flyover4.png" }, // NW (head top-left)
];
const BIRD_POOP = "/catmaze/birds/bird-poop.png";
const POOP_MS = 30000;      // poop lifespan before it fades
const FLYOVER_MS = 2600;    // time a bird takes to cross the maze

// ── CatMaze — the cat boss floors (10/20/30/40/50/60/70/80) ──
// Two phases on a freshly generated maze:
//   Phase 1 (HUNT) — one cell hides the cat (needle-dim). Find & tap it.
//   Phase 2 (LEAD) — you ARE the dog (WASD / d-pad). The cat ECHO-FOLLOWS your
//     exact trail at a fixed step-lag: walk into a dead-end and it will too, so
//     lead cleanly. Pull the echo onto the centre food bowl to win.
// L1 core: maze + movement + echo + win. Birds / WOOF economy / HUSH land in L2;
// the WOOF button is present now and shows the dog's angry bark animation.

const SPRITE = {
  dogIdle: ["/catmaze/DogState-Blink1.png", "/catmaze/DogState-Blink2.png"],
  dogAngry: ["/catmaze/DogState-Angry1.png", "/catmaze/DogState-Angry2.png"],
  cat: ["/catmaze/CatState-Blink1.png", "/catmaze/CatState-Blink2.png"],
};

const OPP = { N: "S", S: "N", E: "W", W: "E" };
const DELTA = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

// Recursive-backtracker — a perfect (fully connected) maze.
function genMaze(cols, rows) {
  const g = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ r, c, N: true, E: true, S: true, W: true, v: false }))
  );
  const stack = [];
  let cur = g[0][0];
  cur.v = true;
  let remaining = rows * cols - 1;
  while (remaining > 0) {
    const nb = [];
    for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !g[nr][nc].v) nb.push([dir, g[nr][nc]]);
    }
    if (nb.length) {
      const [dir, next] = nb[Math.floor(Math.random() * nb.length)];
      cur[dir] = false;
      next[OPP[dir]] = false;
      next.v = true;
      stack.push(cur);
      cur = next;
      remaining--;
    } else {
      cur = stack.pop();
    }
  }
  return g;
}

const key = (r, c) => `${r},${c}`;

// Carve a Pac-Man-style 3x3 room at the maze centre: open interior, solid walls
// all around except one gate at the top. The kibble sits in the middle cell.
function carveRoom(g, cols, rows) {
  const cr = Math.floor(rows / 2), cc = Math.floor(cols / 2);
  const inRoom = (r, c) => r >= cr - 1 && r <= cr + 1 && c >= cc - 1 && c <= cc + 1;
  const roomKeys = new Set();
  for (let r = cr - 1; r <= cr + 1; r++) for (let c = cc - 1; c <= cc + 1; c++) roomKeys.add(key(r, c));
  // open the interior
  for (let r = cr - 1; r <= cr + 1; r++) for (let c = cc - 1; c <= cc + 1; c++) {
    if (c + 1 <= cc + 1) { g[r][c].E = false; g[r][c + 1].W = false; }
    if (r + 1 <= cr + 1) { g[r][c].S = false; g[r + 1][c].N = false; }
  }
  // seal the outer border, leaving one gate at top-centre
  const gate = { r: cr - 1, c: cc, dir: "N" };
  for (let r = cr - 1; r <= cr + 1; r++) for (let c = cc - 1; c <= cc + 1; c++) {
    for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
      const nr = r + dr, nc = c + dc;
      if (inRoom(nr, nc)) continue;
      const open = r === gate.r && c === gate.c && dir === gate.dir;
      g[r][c][dir] = !open;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) g[nr][nc][OPP[dir]] = !open;
    }
  }
  return { cr, cc, roomKeys };
}

// Braid the maze: knock out a fraction of dead-ends to create loops, so there
// are genuine alternate routes (a perfect maze has exactly one path anywhere).
function braid(g, cols, rows, p = 0.45) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = g[r][c];
    const walls = ["N", "E", "S", "W"].filter((d) => cell[d]);
    if (walls.length === 3 && Math.random() < p) { // dead-end
      const cand = walls.filter((d) => {
        const [dr, dc] = DELTA[d];
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nr < rows && nc >= 0 && nc < cols;
      });
      if (cand.length) {
        const d = cand[Math.floor(Math.random() * cand.length)];
        const [dr, dc] = DELTA[d];
        cell[d] = false;
        g[r + dr][c + dc][OPP[d]] = false;
      }
    }
  }
}

function reachable(g, cols, rows, from, to) {
  const seen = new Set([key(from.r, from.c)]);
  const q = [from];
  while (q.length) {
    const { r, c } = q.shift();
    if (r === to.r && c === to.c) return true;
    for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
      if (g[r][c][dir]) continue;
      const nr = r + dr, nc = c + dc, k = key(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen.has(k)) { seen.add(k); q.push({ r: nr, c: nc }); }
    }
  }
  return false;
}

// Shortest path from -> to avoiding any cell in `blocked` (a Set of keys).
// Returns an array of {r,c} (inclusive of both ends) or null.
function bfsPath(g, cols, rows, from, to, blocked) {
  const sk = key(from.r, from.c);
  const prev = { [sk]: null };
  const q = [from];
  while (q.length) {
    const { r, c } = q.shift();
    if (r === to.r && c === to.c) {
      const path = []; let cur = key(r, c);
      while (cur) { const [pr, pc] = cur.split(",").map(Number); path.unshift({ r: pr, c: pc }); cur = prev[cur]; }
      return path;
    }
    for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
      if (g[r][c][dir]) continue;
      const nr = r + dr, nc = c + dc, k = key(nr, nc);
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (blocked && blocked.has(k)) continue;
      if (k in prev) continue;
      prev[k] = key(r, c); q.push({ r: nr, c: nc });
    }
  }
  return null;
}

// Blink driver — holds the open frame, flashes the closed frame at natural gaps.
function useBlink(frames) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let t1, t2;
    const loop = () => {
      t1 = setTimeout(() => {
        setClosed(true);
        t2 = setTimeout(() => { setClosed(false); loop(); }, 130);
      }, 2400 + Math.random() * 3200);
    };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return closed ? frames[1] : frames[0];
}

function DogSprite({ woofing, size }) {
  const idle = useBlink(SPRITE.dogIdle);
  const [af, setAf] = useState(0);
  useEffect(() => {
    if (!woofing) return;
    const iv = setInterval(() => setAf((f) => f ^ 1), 110);
    return () => clearInterval(iv);
  }, [woofing]);
  const src = woofing ? SPRITE.dogAngry[af] : idle;
  return <img src={src} width={size} height={size} alt="" draggable={false}
    style={{ filter: "drop-shadow(0 0 6px hsl(120 90% 50% / 0.5))" }} />;
}

function CatSprite({ size, dim }) {
  const src = useBlink(SPRITE.cat);
  return <img src={src} width={size} height={size} alt="" draggable={false}
    style={{ opacity: dim ? 0.13 : 1, transition: "opacity 0.5s",
      filter: dim ? "none" : "drop-shadow(0 0 6px hsl(120 90% 50% / 0.5))" }} />;
}

function BirdSprite({ variant, angry, size }) {
  const idle = useBlink(BIRDS[variant].blink);
  const src = angry ? BIRDS[variant].angry[0] : idle;
  return <img src={src} width={size} height={size} alt="" draggable={false}
    style={{ filter: `drop-shadow(0 0 6px ${angry ? "hsl(0 80% 55% / 0.6)" : "hsl(120 90% 50% / 0.5)"})` }} />;
}

// A bird flying straight across the maze in its fixed directional pose (no
// frame animation) during the revenge phase.
function FlyoverBird({ fo, size, onDone }) {
  return (
    <motion.img
      src={fo.src}
      alt=""
      draggable={false}
      initial={{ left: `${fo.startX}%`, top: `${fo.startY}%` }}
      animate={{ left: `${fo.endX}%`, top: `${fo.endY}%` }}
      transition={{ duration: FLYOVER_MS / 1000, ease: "linear" }}
      onAnimationComplete={onDone}
      style={{
        position: "absolute", transform: "translate(-50%,-50%)",
        width: size, zIndex: 8, pointerEvents: "none",
        filter: "drop-shadow(0 0 9px hsl(120 90% 50% / 0.5))",
      }}
    />
  );
}

export default function CatMazeFloor({ floor, floorData, onAdvance, onWin, isFinal }) {
  // Maze dims scale with the floor; bigger on desktop for more pathways, smaller
  // on phones so cells stay tappable. Chosen once per mount.
  const dims = useRef(
    (() => {
      const desktop = typeof window !== "undefined" && window.innerWidth >= 768;
      const tier = isFinal ? "final" : floor >= 50 ? "mid" : "early";
      const table = {
        early: desktop ? { cols: 17, rows: 13, lag: 7, birds: 9 } : { cols: 11, rows: 9, lag: 5, birds: 5 },
        mid: desktop ? { cols: 19, rows: 15, lag: 8, birds: 12 } : { cols: 13, rows: 11, lag: 6, birds: 7 },
        final: desktop ? { cols: 23, rows: 17, lag: 10, birds: 16 } : { cols: 15, rows: 13, lag: 7, birds: 9 },
      };
      return table[tier];
    })()
  );
  const { cols, rows, lag: LAG, birds: BIRD_COUNT } = dims.current;

  // Built once per mount (a refresh re-rolls the whole run → fresh maze).
  const build = useRef(null);
  if (!build.current) {
    // Generate the maze + centre room, re-rolling until the kibble is reachable
    // from the dog's start (sealing the room can isolate it on a bad roll).
    let grid, room, tries = 0;
    do {
      grid = genMaze(cols, rows);
      braid(grid, cols, rows);          // add loops → multiple pathways
      room = carveRoom(grid, cols, rows); // re-seals the room border after braiding
      tries++;
    } while (!reachable(grid, cols, rows, { r: 0, c: 0 }, { r: room.cr, c: room.cc }) && tries < 60);
    const bowl = { r: room.cr, c: room.cc };

    // Random dog start: a cell reachable from the kibble, out of the room and a
    // fair distance from it, so the start varies run to run.
    const reach = new Set([key(bowl.r, bowl.c)]);
    const rq = [bowl];
    while (rq.length) {
      const { r, c } = rq.shift();
      for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
        if (!grid[r][c][dir]) {
          const nr = r + dr, nc = c + dc, k = key(nr, nc);
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !reach.has(k)) { reach.add(k); rq.push({ r: nr, c: nc }); }
        }
      }
    }
    const minStartDist = Math.max(4, Math.floor((cols + rows) / 4));
    const startOpts = [];
    for (const k of reach) {
      const [r, c] = k.split(",").map(Number);
      if (room.roomKeys.has(k)) continue;
      if (Math.abs(r - bowl.r) + Math.abs(c - bowl.c) < minStartDist) continue;
      startOpts.push({ r, c });
    }
    const start = startOpts.length ? startOpts[Math.floor(Math.random() * startOpts.length)] : { r: 0, c: 0 };

    // Cat spawns right next to the dog (an open neighbour of the start cell)
    // and echo-trails from there — no hunt phase.
    let catSpawn = start;
    for (const [dir, [dr, dc]] of Object.entries(DELTA)) {
      if (!grid[start.r][start.c][dir]) {
        const nr = start.r + dr, nc = start.c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) { catSpawn = { r: nr, c: nc }; break; }
      }
    }
    // A flock of perching birds (L2): open non-room cells, spread apart and away
    // from the dog/cat start. Collect every eligible cell, shuffle, then fill to
    // BIRD_COUNT greedily — a first pass prefers good spacing, a second pass tops
    // up so the full flock always spawns.
    const bad = new Set([key(start.r, start.c), key(catSpawn.r, catSpawn.c), ...room.roomKeys]);
    const eligible = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (bad.has(key(r, c))) continue;
      if (Math.abs(r - start.r) + Math.abs(c - start.c) < 3) continue;  // not hugging the start
      if (Math.abs(r - room.cr) + Math.abs(c - room.cc) < 2) continue;  // clear of the gate
      eligible.push({ r, c });
    }
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const birds = [];
    const fill = (minSpace) => {
      for (const cell of eligible) {
        if (birds.length >= BIRD_COUNT) break;
        if (birds.some((o) => Math.abs(o.r - cell.r) + Math.abs(o.c - cell.c) < minSpace)) continue;
        birds.push({ id: birds.length, variant: birds.length % 2 === 0 ? "L" : "R", r: cell.r, c: cell.c });
      }
    };
    fill(3); // nicely spread
    fill(1); // top up to the full count if the maze was tight
    build.current = { grid, bowl, catSpawn, roomKeys: room.roomKeys, birds, start };
  }
  const { grid, bowl, catSpawn, roomKeys, birds, start } = build.current;

  const [phase, setPhase] = useState("lead"); // lead | won
  const [dog, setDog] = useState(start);
  const [path, setPath] = useState([start]);
  const [woofing, setWoofing] = useState(false);
  const [meowPop, setMeowPop] = useState(0); // bumps to retrigger the cat's poke bounce
  const [birdsGone, setBirdsGone] = useState(() => birds.map(() => false));
  const [catIdx, setCatIdx] = useState(0);
  const [poops, setPoops] = useState([]);       // {r,c,at} — blocks both, fades after POOP_MS
  const [flyovers, setFlyovers] = useState([]);  // birds mid-flight
  const flyId = useRef(0);
  const revenge = birdsGone.length > 0 && birdsGone.every(Boolean);

  const phaseRef = useRef(phase);
  const dogRef = useRef(dog);
  const pathRef = useRef(path);
  const lastMove = useRef(0);
  const blockedDogRef = useRef(new Set());
  phaseRef.current = phase;
  dogRef.current = dog;
  pathRef.current = path;

  // Cat trails the dog: index 0 = catSpawn, index i>=1 = path[i-1].
  const catTrailAt = (i) => (i <= 0 ? catSpawn : (path[i - 1] ?? path[path.length - 1]));
  const cat = catTrailAt(catIdx);

  // Perching birds AND poop block the path for BOTH. Dog can't step onto them;
  // the cat halts before them too.
  const poopSet = new Set(poops.map((p) => key(p.r, p.c)));
  const blockedDog = new Set(poopSet);
  birds.forEach((b, i) => { if (!birdsGone[i]) blockedDog.add(key(b.r, b.c)); });
  blockedDogRef.current = blockedDog;
  const catCellRef = useRef(cat); catCellRef.current = cat;
  const poopsRef = useRef(poops); poopsRef.current = poops;

  // Advance the cat monotonically toward its lagged target, stopping before the
  // first blocked cell ahead (a perched bird or poop). It never moves back, so a
  // block appearing behind it is ignored; clearing a block ahead lets it catch
  // up. Synced to the dog, so it keeps a fixed lag regardless of frame timing.
  useEffect(() => {
    const blocked = new Set();
    birds.forEach((b, i) => { if (!birdsGone[i]) blocked.add(key(b.r, b.c)); });
    poops.forEach((p) => blocked.add(key(p.r, p.c)));
    const target = path.length - LAG;
    setCatIdx((prev) => {
      let i = Math.max(prev, 0);
      while (i < target) {
        const cell = path[i] ?? path[path.length - 1]; // catTrailAt(i + 1)
        if (blocked.has(key(cell.r, cell.c))) break;
        i++;
      }
      return i;
    });
  }, [path, birdsGone, poops]); // eslint-disable-line

  // Win when the echo reaches the bowl.
  useEffect(() => {
    if (phase === "lead" && cat.r === bowl.r && cat.c === bowl.c) {
      setPhase("won");
      setTimeout(() => (isFinal ? onWin() : onAdvance(floorData.nextFloor)), 2200);
    }
  }, [catIdx, phase]); // eslint-disable-line

  // Pick a cell to poop: on the dog's current route to the kibble, a little
  // ahead of the dog, clear of the room and the cat, and never one that would
  // seal the dog off from the kibble.
  const chooseDrop = () => {
    const start = dogRef.current;
    const blocked = new Set(poopsRef.current.map((p) => key(p.r, p.c)));
    const route = bfsPath(grid, cols, rows, start, bowl, blocked);
    if (!route || route.length < 4) return null;
    const catC = catCellRef.current;
    const cands = route.slice(2).filter((c) =>
      !roomKeys.has(key(c.r, c.c)) &&
      !blocked.has(key(c.r, c.c)) &&
      Math.max(Math.abs(c.r - catC.r), Math.abs(c.c - catC.c)) > 2
    ).sort(() => Math.random() - 0.5);
    for (const c of cands) {
      const trial = new Set(blocked); trial.add(key(c.r, c.c));
      if (bfsPath(grid, cols, rows, start, bowl, trial)) return c;
    }
    return null;
  };

  // Revenge: once both birds are woofed off, they fly over and bomb the route.
  useEffect(() => {
    if (!revenge || phase !== "lead") return;
    let alive = true;
    const launch = () => {
      if (!alive) return;
      const drop = chooseDrop();
      if (!drop) return;
      // Fly straight through the drop cell along one of the four pose directions;
      // the drop cell is the midpoint, so the poop lands at t = 0.5.
      const dir = FLYOVER_DIRS[Math.floor(Math.random() * FLYOVER_DIRS.length)];
      const dropX = ((drop.c + 0.5) / cols) * 100;
      const dropY = ((drop.r + 0.5) / rows) * 100;
      const span = 150;
      setFlyovers((fs) => [...fs, {
        id: ++flyId.current, src: dir.src,
        startX: dropX - dir.dx * span, startY: dropY - dir.dy * span,
        endX: dropX + dir.dx * span, endY: dropY + dir.dy * span,
      }]);
      setTimeout(() => {
        if (!alive) return;
        setPoops((ps) => (ps.some((q) => q.r === drop.r && q.c === drop.c)
          ? ps : [...ps, { r: drop.r, c: drop.c, at: Date.now() }]));
      }, FLYOVER_MS * 0.5);
    };
    const t0 = setTimeout(launch, 1200);
    const iv = setInterval(launch, 3600);
    return () => { alive = false; clearTimeout(t0); clearInterval(iv); };
  }, [revenge, phase]); // eslint-disable-line

  // Fade poop once it's older than POOP_MS.
  useEffect(() => {
    if (!poops.length) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setPoops((ps) => { const n = ps.filter((p) => now - p.at < POOP_MS); return n.length === ps.length ? ps : n; });
    }, 1000);
    return () => clearInterval(iv);
  }, [poops.length]);

  const removeFlyover = (id) => setFlyovers((fs) => fs.filter((f) => f.id !== id));

  const step = useCallback((dir) => {
    if (phaseRef.current !== "lead") return;
    const now = performance.now();
    if (now - lastMove.current < 70) return;
    const cell = grid[dogRef.current.r][dogRef.current.c];
    if (cell[dir]) return; // wall
    const [dr, dc] = DELTA[dir];
    const np = { r: dogRef.current.r + dr, c: dogRef.current.c + dc };
    if (blockedDogRef.current.has(key(np.r, np.c))) return; // poop blocks the dog
    lastMove.current = now;
    setDog(np);
    setPath((p) => [...p, np]);
  }, [grid]);

  // Keyboard (desktop): WASD + arrows to move, space to woof.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      const map = { w: "N", arrowup: "N", s: "S", arrowdown: "S", a: "W", arrowleft: "W", d: "E", arrowright: "E" };
      if (map[k]) { e.preventDefault(); step(map[k]); }
      else if (k === " ") { e.preventDefault(); doWoof(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const woofTimer = useRef(null);
  const doWoof = () => {
    setWoofing(true);
    clearTimeout(woofTimer.current);
    woofTimer.current = setTimeout(() => setWoofing(false), 900);
    playSfx(WOOF_SFX); // respects the Settings Sound-FX volume + mute
    // Scare any perched bird within the ripple radius (phase 1).
    setBirdsGone((prev) => {
      if (prev.every(Boolean)) return prev;
      const d = dogRef.current;
      let changed = false;
      const next = prev.map((gone, i) => {
        if (gone) return true;
        const b = birds[i];
        if (Math.max(Math.abs(b.r - d.r), Math.abs(b.c - d.c)) <= WOOF_RADIUS) { changed = true; return true; }
        return gone;
      });
      return changed ? next : prev;
    });
  };

  // Path cells still ahead of the cat — the route the echo is about to walk.
  const upcoming = new Set();
  for (let i = catIdx; i <= path.length; i++) { const c = catTrailAt(i); upcoming.add(key(c.r, c.c)); }
  const catNext = catTrailAt(catIdx + 1);

  const cx = (c) => ((c + 0.5) / cols) * 100;
  const cy = (r) => ((r + 0.5) / rows) * 100;
  const MAZE_W = 760; // desktop cap; mobile uses the vw term below
  const spriteSize = `min(${92 / cols}vw, ${(MAZE_W * 0.95) / cols}px)`;
  const kibbleSize = `min(${150 / cols}vw, ${(MAZE_W * 1.55) / cols}px)`;

  const wallCol = "hsl(158 40% 32%)";
  const wall = (on) => (on ? `2px solid ${wallCol}` : "2px solid transparent");

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 overflow-y-auto"
      style={{ backgroundColor: floorData.bg || "#0a0f0d", zIndex: 40 }}
    >
      <div className="min-h-full flex flex-col items-center px-3 py-5 gap-4">
        {/* Boss label */}
        <div className="flex justify-center">
          <span className="font-mono-game text-xs text-destructive/70 tracking-widest border border-destructive/30 rounded px-3 py-1 uppercase">
            {isFinal ? "⚠ THE FINAL FLOOR — CatMaze" : "⚠ Boss Floor — CatMaze"}
          </span>
        </div>

        {/* Instruction */}
        <p className="font-mono-game text-[11px] sm:text-xs text-primary/70 tracking-wide text-center max-w-md leading-relaxed">
          {phase !== "lead"
            ? "The cat reached the food. It knew where it was the whole time. It was waiting to see if you did."
            : !revenge
            ? `A flock of birds is blocking the way (${birdsGone.filter((g) => !g).length} left). WOOF near them to scare them off — then lead the cat to the food.`
            : "Revenge! The birds are dive-bombing — their droppings block the path (yours and the cat's) until they fade. Lead the cat around the mess to the food."}
        </p>

        {/* Maze */}
        <div
          className="relative"
          style={{
            width: `min(92vw, ${MAZE_W}px)`,
            aspectRatio: `${cols} / ${rows}`,
            border: `2px solid ${wallCol}`,
            borderRadius: 6,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {/* Wall cells */}
          {grid.flat().map((cell) => {
            const onPath = upcoming.has(key(cell.r, cell.c));
            return (
              <div
                key={key(cell.r, cell.c)}
                style={{
                  boxSizing: "border-box",
                  borderTop: wall(cell.N),
                  borderRight: wall(cell.E),
                  borderBottom: wall(cell.S),
                  borderLeft: wall(cell.W),
                  background: roomKeys.has(key(cell.r, cell.c))
                    ? "hsl(43 96% 56% / 0.07)"
                    : onPath ? "hsl(158 64% 50% / 0.10)" : "transparent",
                }}
              />
            );
          })}

          {/* Cat kibble — the goal, in the centre room */}
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{ left: `${cx(bowl.c)}%`, top: `${cy(bowl.r)}%`, transform: "translate(-50%,-50%)",
              width: `${100 / cols}%`, height: `${100 / rows}%`, zIndex: 2 }}>
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ flexShrink: 0, display: "flex" }}
            >
              <img
                src="/catmaze/catkibble.png"
                alt=""
                draggable={false}
                style={{ width: kibbleSize, flexShrink: 0, filter: "drop-shadow(0 0 8px hsl(43 96% 56% / 0.6))" }}
              />
            </motion.div>
          </div>

          {/* Bird poop (revenge) — blocks both dog and cat until it fades */}
          <AnimatePresence>
            {poops.map((p) => (
              <motion.div
                key={`${p.r},${p.c},${p.at}`}
                className="absolute pointer-events-none flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.4 }}
                style={{
                  left: `${(p.c / cols) * 100}%`, top: `${(p.r / rows) * 100}%`,
                  width: `${100 / cols}%`, height: `${100 / rows}%`, zIndex: 1,
                }}
              >
                <img src={BIRD_POOP} alt="" draggable={false}
                  style={{ width: "92%", filter: "drop-shadow(0 0 5px hsl(90 50% 75% / 0.5))" }} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Perching birds (phase 1) — block the cat until woofed off */}
          <AnimatePresence>
            {birds.map((b, i) => (
              !birdsGone[i] && (
                <motion.div
                  key={b.id}
                  className="absolute pointer-events-none flex items-center justify-center"
                  initial={false}
                  exit={{ opacity: 0, y: -18, scale: 0.7 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    left: `${(b.c / cols) * 100}%`, top: `${(b.r / rows) * 100}%`,
                    width: `${100 / cols}%`, height: `${100 / rows}%`, zIndex: 3,
                  }}
                >
                  <BirdSprite
                    variant={b.variant}
                    angry={
                      Math.max(Math.abs(b.r - dog.r), Math.abs(b.c - dog.c)) <= WOOF_RADIUS ||
                      (catNext && catNext.r === b.r && catNext.c === b.c)
                    }
                    size={spriteSize}
                  />
                </motion.div>
              )
            ))}
          </AnimatePresence>

          {/* Cat — echo-trails the dog. Click it for a cheeky meow (easter egg). */}
          <div className="absolute flex items-center justify-center"
            onClick={() => { playSfx(MEOW_SFX); setMeowPop((n) => n + 1); }}
            title="meow?"
            style={{
              left: `${cx(cat.c)}%`, top: `${cy(cat.r)}%`, transform: "translate(-50%,-50%)",
              width: `${100 / cols}%`, height: `${100 / rows}%`,
              transition: "left 0.14s linear, top 0.14s linear", zIndex: 3,
              cursor: "pointer",
            }}>
            <motion.div
              key={meowPop}
              animate={meowPop ? { scale: [1, 1.28, 0.92, 1] } : {}}
              transition={{ duration: 0.4 }}
              style={{ display: "flex" }}
            >
              <CatSprite size={spriteSize} />
            </motion.div>
          </div>

          {/* Dog — you */}
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: `${cx(dog.c)}%`, top: `${cy(dog.r)}%`, transform: "translate(-50%,-50%)",
              width: `${100 / cols}%`, height: `${100 / rows}%`,
              transition: "left 0.12s linear, top 0.12s linear", zIndex: 5,
            }}>
            <DogSprite woofing={woofing} size={spriteSize} />

            {/* Bark dialogue box — flips below the dog when it's on the top row */}
            <AnimatePresence>
              {woofing && (
                <motion.div
                  key="bark"
                  initial={{ opacity: 0, scale: 0.5, y: dog.r <= 0 ? -6 : 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: dog.r <= 0 ? -4 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute"
                  style={dog.r <= 0
                    ? { top: "92%", left: "72%", zIndex: 6 }
                    : { bottom: "92%", left: "72%", zIndex: 6 }}
                >
                  <div
                    className="font-vt323 whitespace-nowrap"
                    style={{
                      position: "relative",
                      fontSize: "clamp(16px, 3.4vw, 24px)",
                      color: "hsl(43 96% 56%)",
                      background: "hsl(20 14% 6%)",
                      border: "2px solid hsl(43 96% 56%)",
                      borderRadius: 8,
                      padding: "2px 10px",
                      letterSpacing: "0.08em",
                      boxShadow: "0 0 10px hsl(43 96% 56% / 0.5)",
                    }}
                  >
                    WOOF!
                    {/* tail — points toward the dog */}
                    <span style={dog.r <= 0
                      ? { position: "absolute", left: "16%", bottom: "100%", width: 0, height: 0,
                          borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                          borderBottom: "7px solid hsl(43 96% 56%)" }
                      : { position: "absolute", left: "16%", top: "100%", width: 0, height: 0,
                          borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                          borderTop: "7px solid hsl(43 96% 56%)" }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Flyover birds (revenge) — cross the maze and drop poop */}
          {flyovers.map((f) => (
            <FlyoverBird
              key={f.id}
              fo={f}
              size={`min(${130 / cols}vw, ${(MAZE_W * 1.35) / cols}px)`}
              onDone={() => removeFlyover(f.id)}
            />
          ))}
        </div>

        {/* Controls (lead phase) */}
        <AnimatePresence>
          {phase === "lead" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-6 select-none"
            >
              {/* D-pad */}
              <div className="grid grid-cols-3 gap-1" style={{ width: 150 }}>
                <span />
                <DpadBtn label="▲" onPress={() => step("N")} />
                <span />
                <DpadBtn label="◀" onPress={() => step("W")} />
                <DpadBtn label="●" dim onPress={() => {}} />
                <DpadBtn label="▶" onPress={() => step("E")} />
                <span />
                <DpadBtn label="▼" onPress={() => step("S")} />
                <span />
              </div>

              {/* WOOF */}
              <button
                type="button"
                onPointerDown={doWoof}
                className="font-vt323 text-2xl px-5 py-4 rounded border tracking-widest transition-all"
                style={{
                  color: "hsl(43 96% 56%)", borderColor: "hsl(43 96% 56% / 0.5)",
                  background: woofing ? "hsl(43 96% 56% / 0.18)" : "hsl(43 96% 56% / 0.06)",
                }}
              >
                WOOF!
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Win curtain — a beat before advancing so the floor doesn't snap away */}
      <AnimatePresence>
        {phase === "won" && (
          <motion.div
            key="wincurtain"
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
            style={{ zIndex: 60, background: "#05070a" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          >
            <motion.img
              src={SPRITE.cat[0]}
              alt=""
              draggable={false}
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: [0, 1.18, 1], rotate: [-8, 5, 0], y: [8, -14, 0] }}
              transition={{ delay: 0.2, duration: 0.75 }}
              style={{ width: "min(32vw, 150px)", filter: "drop-shadow(0 0 14px hsl(120 90% 50% / 0.6))" }}
            />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mt-5 font-vt323 text-3xl text-primary glow-green tracking-widest"
            >
              {isFinal ? "THE CAT IS FED — YOU ESCAPE" : "FED. THE DOOR OPENS."}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DpadBtn({ label, onPress, dim }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="font-mono-game rounded border transition-colors"
      style={{
        aspectRatio: "1", fontSize: 18,
        color: dim ? "hsl(158 15% 40%)" : "hsl(158 30% 80%)",
        borderColor: "hsl(158 20% 30%)",
        background: dim ? "transparent" : "hsl(158 20% 12%)",
        cursor: dim ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
