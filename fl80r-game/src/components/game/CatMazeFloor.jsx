import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  // Maze dims scale a touch with the floor; final floor is the biggest.
  const dims = useRef(
    isFinal ? { cols: 15, rows: 13, lag: 7 } : floor >= 50 ? { cols: 13, rows: 11, lag: 6 } : { cols: 11, rows: 9, lag: 5 }
  );
  const { cols, rows, lag: LAG } = dims.current;

  // Built once per mount (a refresh re-rolls the whole run → fresh maze).
  const build = useRef(null);
  if (!build.current) {
    const grid = genMaze(cols, rows);
    const bowl = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    // Cat spawns right next to the dog (an open neighbour of the start cell)
    // and echo-trails from there — no hunt phase.
    let catSpawn = { r: 0, c: 1 };
    for (const [dir, dr, dc] of [["E", 0, 1], ["S", 1, 0]]) {
      if (!grid[0][0][dir]) { catSpawn = { r: dr, c: dc }; break; }
    }
    build.current = { grid, bowl, catSpawn };
  }
  const { grid, bowl, catSpawn } = build.current;

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
  const doWoof = () => {
    setWoofing(true);
    clearTimeout(woofTimer.current);
    woofTimer.current = setTimeout(() => setWoofing(false), 650);
  };

  // Path cells still ahead of the cat — the route the echo is about to walk.
  const upcoming = new Set();
  for (let i = catIdx; i < catTrail.length; i++) upcoming.add(key(catTrail[i].r, catTrail[i].c));

  const cx = (c) => ((c + 0.5) / cols) * 100;
  const cy = (r) => ((r + 0.5) / rows) * 100;
  const spriteSize = `min(${86 / cols}vw, ${520 / cols}px)`;

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
            width: "min(86vw, 520px)",
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
                  background: onPath ? "hsl(158 64% 50% / 0.10)" : "transparent",
                }}
              />
            );
          })}

          {/* Food bowl (centre) */}
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{ left: `${cx(bowl.c)}%`, top: `${cy(bowl.r)}%`, transform: "translate(-50%,-50%)",
              width: `${100 / cols}%`, height: `${100 / rows}%` }}>
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: "62%", height: "62%", borderRadius: "50%",
                border: "2px solid hsl(43 96% 56%)", boxShadow: "0 0 10px hsl(43 96% 56% / 0.6)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: "42%", height: "42%", borderRadius: "50%", background: "hsl(43 96% 56%)" }} />
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
              transition: "left 0.12s linear, top 0.12s linear", zIndex: 4,
            }}>
            <DogSprite woofing={woofing} size={spriteSize} />
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
