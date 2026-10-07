import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isMuted } from "@/lib/music";

const WOOF_SFX = "/audio/woof-vfx.mp3";

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

export default function CatMazeFloor({ floor, floorData, onAdvance, onWin, isFinal }) {
  // Maze dims scale with the floor; bigger on desktop for more pathways, smaller
  // on phones so cells stay tappable. Chosen once per mount.
  const dims = useRef(
    (() => {
      const desktop = typeof window !== "undefined" && window.innerWidth >= 768;
      const tier = isFinal ? "final" : floor >= 50 ? "mid" : "early";
      const table = {
        early: desktop ? { cols: 17, rows: 13, lag: 7 } : { cols: 11, rows: 9, lag: 5 },
        mid: desktop ? { cols: 19, rows: 15, lag: 8 } : { cols: 13, rows: 11, lag: 6 },
        final: desktop ? { cols: 23, rows: 17, lag: 10 } : { cols: 15, rows: 13, lag: 7 },
      };
      return table[tier];
    })()
  );
  const { cols, rows, lag: LAG } = dims.current;

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
    // Cat spawns right next to the dog (an open neighbour of the start cell)
    // and echo-trails from there — no hunt phase.
    let catSpawn = { r: 0, c: 1 };
    for (const [dir, dr, dc] of [["E", 0, 1], ["S", 1, 0]]) {
      if (!grid[0][0][dir]) { catSpawn = { r: dr, c: dc }; break; }
    }
    build.current = { grid, bowl, catSpawn, roomKeys: room.roomKeys };
  }
  const { grid, bowl, catSpawn, roomKeys } = build.current;

  const [phase, setPhase] = useState("lead"); // lead | won
  const [dog, setDog] = useState({ r: 0, c: 0 });
  const [path, setPath] = useState([{ r: 0, c: 0 }]);
  const [woofing, setWoofing] = useState(false);

  const phaseRef = useRef(phase);
  const dogRef = useRef(dog);
  const pathRef = useRef(path);
  const lastMove = useRef(0);
  phaseRef.current = phase;
  dogRef.current = dog;
  pathRef.current = path;

  // Cat starts beside the dog, then trails its exact path LAG steps behind.
  // Prepending the spawn means the cat walks spawn -> start -> the dog's route
  // with no teleport.
  const catTrail = [catSpawn, ...path];
  const catIdx = Math.max(0, catTrail.length - 1 - LAG);
  const cat = catTrail[catIdx];

  // Win when the echo reaches the bowl.
  useEffect(() => {
    if (phase === "lead" && cat.r === bowl.r && cat.c === bowl.c) {
      setPhase("won");
      setTimeout(() => (isFinal ? onWin() : onAdvance(floorData.nextFloor)), 1400);
    }
  }, [cat.r, cat.c, phase]); // eslint-disable-line

  const step = useCallback((dir) => {
    if (phaseRef.current !== "lead") return;
    const now = performance.now();
    if (now - lastMove.current < 70) return;
    const cell = grid[dogRef.current.r][dogRef.current.c];
    if (cell[dir]) return; // wall
    const [dr, dc] = DELTA[dir];
    const np = { r: dogRef.current.r + dr, c: dogRef.current.c + dc };
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
  const woofSfx = useRef(null);
  const doWoof = () => {
    setWoofing(true);
    clearTimeout(woofTimer.current);
    woofTimer.current = setTimeout(() => setWoofing(false), 900);
    // Bark sound — respects the Settings mute toggle.
    try {
      if (!isMuted()) {
        if (!woofSfx.current) {
          woofSfx.current = new Audio(WOOF_SFX);
          woofSfx.current.volume = 0.55;
        }
        woofSfx.current.currentTime = 0;
        woofSfx.current.play().catch(() => {});
      }
    } catch { /* ignore */ }
  };

  // Path cells still ahead of the cat — the route the echo is about to walk.
  const upcoming = new Set();
  for (let i = catIdx; i < catTrail.length; i++) upcoming.add(key(catTrail[i].r, catTrail[i].c));

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
          {phase === "lead"
            ? "You are the dog (WASD / arrows / d-pad). The cat walks your exact trail, a few steps behind — lead it to the food. Walk into a dead-end and it will too."
            : "The cat reached the food. It knew where it was the whole time. It was waiting to see if you did."}
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

          {/* Cat — echo-trails the dog, starting from beside it */}
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: `${cx(cat.c)}%`, top: `${cy(cat.r)}%`, transform: "translate(-50%,-50%)",
              width: `${100 / cols}%`, height: `${100 / rows}%`,
              transition: "left 0.14s linear, top 0.14s linear", zIndex: 3,
            }}>
            <CatSprite size={spriteSize} />
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

        {phase === "won" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="font-vt323 text-3xl text-primary glow-green tracking-widest">
            {isFinal ? "THE CAT IS FED — YOU ESCAPE" : "FED. THE DOOR OPENS."}
          </motion.p>
        )}
      </div>
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
