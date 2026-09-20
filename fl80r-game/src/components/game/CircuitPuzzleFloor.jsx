import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Circuit piece definitions ───────────────────────────────────────────────
// Each piece has connection ports: N, E, S, W (true = has connection)
// Visual is an SVG path drawn inside a 40x40 box
const PIECE_TYPES = {
  straight_h:  { ports: { N:false, E:true,  S:false, W:true  }, label: "─" },
  straight_v:  { ports: { N:true,  E:false, S:true,  W:false }, label: "│" },
  corner_ne:   { ports: { N:true,  E:true,  S:false, W:false }, label: "└" },
  corner_nw:   { ports: { N:true,  E:false, S:false, W:true  }, label: "┘" },
  corner_se:   { ports: { N:false, E:true,  S:true,  W:false }, label: "┌" },
  corner_sw:   { ports: { N:false, E:false, S:true,  W:true  }, label: "┐" },
  t_north:     { ports: { N:true,  E:true,  S:false, W:true  }, label: "┴" },
  t_south:     { ports: { N:false, E:true,  S:true,  W:true  }, label: "┬" },
  t_east:      { ports: { N:true,  E:true,  S:true,  W:false }, label: "├" },
  t_west:      { ports: { N:true,  E:false, S:true,  W:true  }, label: "┤" },
  cross:       { ports: { N:true,  E:true,  S:true,  W:true  }, label: "┼" },
  empty:       { ports: { N:false, E:false, S:false, W:false }, label: " " },
};

const TYPE_KEYS = Object.keys(PIECE_TYPES).filter(k => k !== "empty");

// Rotate ports 90° clockwise
function rotatePorts(ports) {
  return { N: ports.W, E: ports.N, S: ports.E, W: ports.S };
}

// Get effective ports after n rotations
function getEffectivePorts(typeKey, rotation) {
  let ports = { ...PIECE_TYPES[typeKey].ports };
  for (let i = 0; i < (rotation % 4); i++) ports = rotatePorts(ports);
  return ports;
}

// SVG path for a circuit piece (40x40 viewBox)
function PieceSVG({ typeKey, rotation, solved, isSource, isDest }) {
  const ports = getEffectivePorts(typeKey, rotation);
  const cx = 20, cy = 20, r = 5;
  const color = solved ? "hsl(158 64% 52%)" : isSource ? "hsl(43 96% 56%)" : isDest ? "hsl(0 72% 51%)" : "hsl(158 64% 52% / 0.5)";
  const glow = solved ? "drop-shadow(0 0 4px hsl(158 64% 52% / 0.9))" : "none";

  const lines = [];
  if (ports.N) lines.push(`M${cx},${cy} L${cx},0`);
  if (ports.S) lines.push(`M${cx},${cy} L${cx},40`);
  if (ports.E) lines.push(`M${cx},${cy} L40,${cy}`);
  if (ports.W) lines.push(`M${cx},${cy} L0,${cy}`);

  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ filter: glow }}>
      {lines.map((d, i) => (
        <path key={i} d={d} stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={isSource ? "hsl(43 96% 56% / 0.3)" : isDest ? "hsl(0 72% 51% / 0.3)" : "hsl(158 64% 52% / 0.15)"}
        stroke={color} strokeWidth="1.5" />
      {(isSource || isDest) && (
        <circle cx={cx} cy={cy} r="2" fill={color} />
      )}
    </svg>
  );
}

// ─── Puzzle generation ────────────────────────────────────────────────────────
const COLS = 5, ROWS = 7;

const PATTERNS = [
  { name: "the letter H", path: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,3],[2,3],[3,3],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]] },
  { name: "the letter T", path: [[0,0],[1,0],[2,0],[3,0],[4,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6]] },
  { name: "the letter L", path: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,6],[2,6],[3,6],[4,6]] },
  { name: "the letter Z", path: [[0,0],[1,0],[2,0],[3,0],[4,0],[3,1],[2,2],[2,3],[1,4],[0,5],[0,6],[1,6],[2,6],[3,6],[4,6]] },
  { name: "the number 1", path: [[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[1,6],[3,6]] },
  { name: "the number 7", path: [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[3,2],[2,3],[2,4],[2,5],[2,6]] },
  { name: "an arrow pointing right", path: [[0,3],[1,3],[2,3],[3,3],[4,3],[3,2],[3,4],[2,1],[2,5]] },
  { name: "a cross / plus sign", path: [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[0,3],[1,3],[3,3],[4,3]] },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePuzzle() {
  const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  const pathSet = new Set(pattern.path.map(([c, r]) => `${c},${r}`));

  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const inPath = pathSet.has(`${col},${row}`);
      const typeKey = inPath
        ? TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)]
        : "straight_h";
      const correctRotation = 0; // rotation 0 is always "correct" — we shuffle
      const shuffledRotation = Math.floor(Math.random() * 4);
      grid.push({
        id: `${col}-${row}`,
        col, row,
        typeKey,
        inPath,
        correctRotation,
        currentRotation: shuffledRotation,
      });
    }
  }

  // Source = first path cell, Dest = last path cell
  const sourceKey = pattern.path[0];
  const destKey = pattern.path[pattern.path.length - 1];

  return { grid, pattern, sourceKey, destKey };
}

// Check if ALL path cells have rotation = 0 (correct)
function isSolved(grid) {
  return grid.filter(c => c.inPath).every(c => c.currentRotation === c.correctRotation);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CircuitPuzzleFloor({ floor, floorData, onAdvance }) {
  const [puzzle] = useState(() => generatePuzzle());
  const [grid, setGrid] = useState(puzzle.grid);
  const [solved, setSolved] = useState(false);
  const [ekgDone, setEkgDone] = useState(false);

  const handleCellClick = useCallback((cellId) => {
    if (solved) return;
    setGrid(prev => {
      const next = prev.map(c =>
        c.id === cellId
          ? { ...c, currentRotation: (c.currentRotation + 1) % 4 }
          : c
      );
      if (isSolved(next)) {
        setTimeout(() => setSolved(true), 50);
      }
      return next;
    });
  }, [solved]);

  const getCell = (col, row) => grid.find(c => c.col === col && c.row === row);
  const isSource = (col, row) => col === puzzle.sourceKey[0] && row === puzzle.sourceKey[1];
  const isDest   = (col, row) => col === puzzle.destKey[0]   && row === puzzle.destKey[1];

  const sectionColor = {
    "1-10": "hsl(158 64% 52%)",
    "11-20": "hsl(43 96% 56%)",
    "21-30": "hsl(158 64% 52%)",
    "31-40": "hsl(43 96% 56%)",
    "41-50": "hsl(200 64% 52%)",
    "51-60": "hsl(280 50% 55%)",
    "61-70": "hsl(200 70% 60%)",
    "71-79": "hsl(0 72% 51%)",
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center px-4 py-8"
    >
      {/* Badge */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ⚡ Circuit Floor — Pre-Boss
        </span>
      </div>

      {/* Hint */}
      <div className="terminal-border rounded-md p-4 mb-5 max-w-lg w-full text-center">
        <p className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase mb-1">
          ⚠ Circuit Alignment Required
        </p>
        <p className="text-foreground/80 font-mono-game text-sm leading-relaxed">
          The circuit must form <span className="text-primary glow-green">{puzzle.pattern.name}</span>.
        </p>
        <p className="text-muted-foreground font-mono-game text-xs mt-2">
          Click any piece to rotate it 90°. Align all active nodes to complete the pattern.
        </p>
      </div>

      {/* Grid */}
      <div
        className="relative border border-primary/20 rounded-md p-2"
        style={{ background: "rgba(0,0,0,0.4)", boxShadow: "0 0 30px hsl(158 64% 52% / 0.05)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "2px",
          }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const cell = getCell(col, row);
              if (!cell) return null;
              const src = isSource(col, row);
              const dst = isDest(col, row);
              const active = cell.inPath;
              return (
                <motion.div
                  key={cell.id}
                  className="relative cursor-pointer rounded-sm select-none"
                  style={{
                    width: "clamp(44px, 10vw, 62px)",
                    height: "clamp(44px, 10vw, 62px)",
                    background: active
                      ? solved
                        ? "hsl(158 64% 52% / 0.08)"
                        : "hsl(158 64% 52% / 0.04)"
                      : "hsl(220 18% 9% / 0.6)",
                    border: active
                      ? solved
                        ? "1px solid hsl(158 64% 52% / 0.5)"
                        : "1px solid hsl(158 64% 52% / 0.18)"
                      : "1px solid hsl(220 15% 14% / 0.5)",
                    transition: "background 0.3s, border 0.3s",
                  }}
                  animate={{ rotate: cell.currentRotation * 90 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  onClick={() => active && handleCellClick(cell.id)}
                  whileTap={active ? { scale: 0.88 } : {}}
                >
                  {active && (
                    <PieceSVG
                      typeKey={cell.typeKey}
                      rotation={0} // rotation handled by parent motion.div
                      solved={solved}
                      isSource={src}
                      isDest={dst}
                    />
                  )}
                  {!active && (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <div className="w-1 h-1 rounded-full bg-foreground/20" />
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Solved EKG overlay */}
        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none rounded-md overflow-hidden"
            >
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <motion.path
                  d="M5,50 L20,50 L25,20 L30,80 L35,35 L40,65 L45,50 L55,50 L60,50 L65,20 L70,80 L75,50 L95,50"
                  fill="none"
                  stroke="hsl(158 64% 52%)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 3px hsl(158 64% 52% / 0.9))" }}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  onAnimationComplete={() => setEkgDone(true)}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Solved state — door appears */}
      <AnimatePresence>
        {solved && ekgDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <p className="font-mono-game text-xs text-primary/70 tracking-widest">
              ✓ CIRCUIT COMPLETE — BOSS FLOOR UNLOCKED
            </p>

            {/* Animated door */}
            <motion.div
              className="relative flex flex-col items-center justify-center cursor-pointer"
              style={{
                width: 90,
                height: 130,
                border: "2px solid hsl(158 64% 52%)",
                borderRadius: "6px 6px 0 0",
                background: "hsl(158 64% 52% / 0.05)",
                boxShadow: "0 0 24px hsl(158 64% 52% / 0.4), inset 0 0 20px hsl(158 64% 52% / 0.05)",
              }}
              animate={{
                boxShadow: [
                  "0 0 24px hsl(158 64% 52% / 0.4)",
                  "0 0 40px hsl(158 64% 52% / 0.7)",
                  "0 0 24px hsl(158 64% 52% / 0.4)",
                ],
              }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              onClick={() => onAdvance(floorData.nextFloor)}
            >
              {/* EKG line across door */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 90 130">
                <motion.path
                  d="M0,65 L20,65 L28,40 L36,90 L44,55 L52,65 L70,65 L90,65"
                  fill="none"
                  stroke="hsl(158 64% 52%)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 4px hsl(158 64% 52%))" }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}
                />
              </svg>

              {/* Door knob */}
              <div
                className="absolute right-3 rounded-full"
                style={{
                  width: 6, height: 6,
                  background: "hsl(158 64% 52%)",
                  boxShadow: "0 0 6px hsl(158 64% 52%)",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />

              {/* ENTER text */}
              <p
                className="font-vt323 text-lg tracking-widest z-10 mt-2"
                style={{ color: "hsl(158 64% 52%)", textShadow: "0 0 8px hsl(158 64% 52%)" }}
              >
                ENTER
              </p>
            </motion.div>

            <p className="font-mono-game text-xs text-muted-foreground/40 tracking-widest">
              tap the door to face the boss
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient hint while unsolved */}
      {!solved && (
        <motion.p
          className="mt-4 font-mono-game text-[10px] text-muted-foreground/20 tracking-widest text-center"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          rotate the active circuit pieces to form the correct pattern
        </motion.p>
      )}
    </motion.div>
  );
}