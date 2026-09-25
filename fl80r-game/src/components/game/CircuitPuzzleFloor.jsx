import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Neon palette ──────────────────────────────────────────────────────────────
const PALETTE = [
  { id: "green", c: "hsl(158 64% 52%)" },
  { id: "cyan", c: "hsl(190 85% 55%)" },
  { id: "amber", c: "hsl(43 96% 56%)" },
  { id: "magenta", c: "hsl(315 75% 62%)" },
  { id: "red", c: "hsl(0 72% 58%)" },
  { id: "blue", c: "hsl(222 84% 65%)" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLE 1 — WIRES (Among Us): drag each left node to the same-colour right node
// ═══════════════════════════════════════════════════════════════════════════
function WiresPuzzle({ onSolvedChange, locked }) {
  const { colors, rightOrder } = useMemo(() => {
    const count = 4 + Math.floor(Math.random() * 2); // 4–5 wires
    const colors = shuffle(PALETTE).slice(0, count);
    let rightOrder = shuffle(colors);
    // avoid a trivially-aligned board
    if (rightOrder.every((c, i) => c.id === colors[i].id)) rightOrder = shuffle(colors);
    return { colors, rightOrder };
  }, []);

  const W = 300;
  const rowH = 62;
  const H = colors.length * rowH + 20;
  const leftX = 34;
  const rightX = W - 34;
  const yOf = (i) => 30 + i * rowH;
  const R = 15;

  const [wires, setWires] = useState({}); // colorId -> true (connected correctly)
  const [drag, setDrag] = useState(null); // { colorId, x, y }
  const svgRef = useRef(null);

  useEffect(() => {
    onSolvedChange(Object.keys(wires).length === colors.length);
  }, [wires, colors.length, onSolvedChange]);

  const pt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const leftHit = (p) =>
    colors.findIndex((_, i) => Math.hypot(p.x - leftX, p.y - yOf(i)) < R + 10);
  const rightHit = (p) =>
    rightOrder.findIndex((_, i) => Math.hypot(p.x - rightX, p.y - yOf(i)) < R + 12);

  const onDown = (e) => {
    if (locked) return;
    const p = pt(e);
    const li = leftHit(p);
    if (li < 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const colorId = colors[li].id;
    setWires((w) => {
      const n = { ...w };
      delete n[colorId];
      return n;
    });
    setDrag({ colorId, x: p.x, y: p.y });
  };

  const onMove = (e) => {
    if (!drag) return;
    const p = pt(e);
    setDrag((d) => (d ? { ...d, x: p.x, y: p.y } : d));
  };

  const onUp = (e) => {
    if (!drag) return;
    const p = pt(e);
    const ri = rightHit(p);
    if (ri >= 0 && rightOrder[ri].id === drag.colorId) {
      setWires((w) => ({ ...w, [drag.colorId]: ri }));
    }
    setDrag(null);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 360, touchAction: "none", userSelect: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* connected wires */}
      {colors.map((col, i) =>
        wires[col.id] !== undefined ? (
          <line
            key={"w" + col.id}
            x1={leftX}
            y1={yOf(i)}
            x2={rightX}
            y2={yOf(wires[col.id])}
            stroke={col.c}
            strokeWidth="5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${col.c})` }}
          />
        ) : null
      )}
      {/* active drag wire */}
      {drag && (
        <line
          x1={leftX}
          y1={yOf(colors.findIndex((c) => c.id === drag.colorId))}
          x2={drag.x}
          y2={drag.y}
          stroke={colors.find((c) => c.id === drag.colorId).c}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="2 6"
          style={{ filter: `drop-shadow(0 0 4px ${colors.find((c) => c.id === drag.colorId).c})` }}
        />
      )}
      {/* left nodes */}
      {colors.map((col, i) => (
        <g key={"l" + col.id} style={{ cursor: locked ? "default" : "grab" }}>
          <circle cx={leftX} cy={yOf(i)} r={R} fill={col.c} opacity={0.18} />
          <circle cx={leftX} cy={yOf(i)} r={R} fill="none" stroke={col.c} strokeWidth="2.5"
            style={{ filter: `drop-shadow(0 0 5px ${col.c})` }} />
          <circle cx={leftX} cy={yOf(i)} r="4" fill={col.c} />
        </g>
      ))}
      {/* right nodes */}
      {rightOrder.map((col, i) => {
        const done = Object.values(wires).includes(i);
        return (
          <g key={"r" + col.id}>
            <circle cx={rightX} cy={yOf(i)} r={R} fill={col.c} opacity={done ? 0.28 : 0.1} />
            <circle cx={rightX} cy={yOf(i)} r={R} fill="none" stroke={col.c} strokeWidth="2.5"
              strokeDasharray={done ? "0" : "3 3"}
              style={{ filter: done ? `drop-shadow(0 0 5px ${col.c})` : "none" }} />
            <circle cx={rightX} cy={yOf(i)} r="4" fill={col.c} />
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLE 2 — FLOW: drag to connect each pair of same-colour endpoints
// ═══════════════════════════════════════════════════════════════════════════
function genFlow() {
  const N = 5;
  const K = 3 + Math.floor(Math.random() * 2); // 3–4 pairs
  const colors = shuffle(PALETTE).slice(0, K);
  const owner = new Array(N * N).fill(null);
  const idx = (r, c) => r * N + c;
  const nbrs = (cell) => {
    const r = Math.floor(cell / N), c = cell % N, out = [];
    if (r > 0) out.push(idx(r - 1, c));
    if (r < N - 1) out.push(idx(r + 1, c));
    if (c > 0) out.push(idx(r, c - 1));
    if (c < N - 1) out.push(idx(r, c + 1));
    return out;
  };
  const endpoints = {};
  const used = [];
  for (const col of colors) {
    const free = [];
    for (let i = 0; i < N * N; i++) if (owner[i] === null) free.push(i);
    if (free.length < 2) break;
    const start = free[Math.floor(Math.random() * free.length)];
    const path = [start];
    owner[start] = col.id;
    const targetLen = 3 + Math.floor(Math.random() * 4);
    let cur = start;
    while (path.length < targetLen) {
      const opts = nbrs(cur).filter((n) => owner[n] === null);
      if (!opts.length) break;
      const nx = opts[Math.floor(Math.random() * opts.length)];
      owner[nx] = col.id;
      path.push(nx);
      cur = nx;
    }
    if (path.length < 2) {
      owner[start] = null;
      continue;
    }
    endpoints[col.id] = [path[0], path[path.length - 1]];
    used.push(col);
  }
  return { N, colors: used, endpoints };
}

function FlowPuzzle({ onSolvedChange, locked }) {
  const puzzle = useMemo(() => genFlow(), []);
  const { N, colors, endpoints } = puzzle;

  const reserved = useMemo(() => {
    const m = {};
    for (const col of colors) {
      m[endpoints[col.id][0]] = col.id;
      m[endpoints[col.id][1]] = col.id;
    }
    return m;
  }, [colors, endpoints]);

  // paths: colorId -> [cells]
  const [paths, setPaths] = useState({});
  const activeRef = useRef(null);
  const gridRef = useRef(null);

  const solvedCount = colors.filter((col) => {
    const p = paths[col.id];
    if (!p || p.length < 2) return false;
    const [a, b] = endpoints[col.id];
    return (p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a);
  }).length;

  useEffect(() => {
    onSolvedChange(solvedCount === colors.length && colors.length > 0);
  }, [solvedCount, colors.length, onSolvedChange]);

  const cellFrom = (e) => {
    const r = gridRef.current.getBoundingClientRect();
    const size = r.width / N;
    const c = Math.floor((e.clientX - r.left) / size);
    const row = Math.floor((e.clientY - r.top) / size);
    if (c < 0 || c >= N || row < 0 || row >= N) return -1;
    return row * N + c;
  };

  const isEndpoint = (cell, colorId) =>
    endpoints[colorId] && (endpoints[colorId][0] === cell || endpoints[colorId][1] === cell);

  const startDrag = (cell) => {
    if (locked || cell < 0) return;
    let colorId = null;
    let newPath = null;
    if (reserved[cell]) {
      colorId = reserved[cell];
      newPath = [cell]; // start fresh from this endpoint
    } else {
      for (const cid of Object.keys(paths)) {
        if (paths[cid].includes(cell)) {
          colorId = cid;
          break;
        }
      }
      if (!colorId) return;
      const p = paths[colorId];
      newPath = p.slice(0, p.indexOf(cell) + 1); // truncate to here, keep drawing
    }
    activeRef.current = colorId;
    setPaths((prev) => ({ ...prev, [colorId]: newPath }));
  };

  const extendTo = (cell) => {
    const colorId = activeRef.current;
    if (!colorId || cell < 0) return;
    setPaths((prev) => {
      const path = prev[colorId] ? [...prev[colorId]] : [];
      if (!path.length) return prev;
      const last = path[path.length - 1];
      if (cell === last) return prev;
      // must be orthogonally adjacent
      const dr = Math.abs(Math.floor(cell / N) - Math.floor(last / N));
      const dc = Math.abs((cell % N) - (last % N));
      if (dr + dc !== 1) return prev;
      // backtrack over own path
      if (path.length >= 2 && cell === path[path.length - 2]) {
        path.pop();
        return { ...prev, [colorId]: path };
      }
      // blocked by another colour's endpoint
      if (reserved[cell] && reserved[cell] !== colorId) return prev;
      // blocked by another colour's path
      for (const cid of Object.keys(prev)) {
        if (cid !== colorId && prev[cid].includes(cell)) return prev;
      }
      if (path.includes(cell)) return prev; // no self-loop
      path.push(cell);
      return { ...prev, [colorId]: path };
    });
  };

  const onDown = (e) => {
    if (locked) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startDrag(cellFrom(e));
  };
  const onMove = (e) => {
    if (!activeRef.current) return;
    extendTo(cellFrom(e));
  };
  const onUp = () => {
    activeRef.current = null;
  };

  const colorOf = (id) => colors.find((c) => c.id === id)?.c;
  const size = 100;

  // build polyline points per colour
  const centre = (cell) => [((cell % N) + 0.5) * size, (Math.floor(cell / N) + 0.5) * size];

  return (
    <div
      ref={gridRef}
      style={{
        position: "relative",
        width: "min(88vw, 340px)",
        aspectRatio: "1 / 1",
        touchAction: "none",
        userSelect: "none",
        cursor: locked ? "default" : "crosshair",
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* cells */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gridTemplateRows: `repeat(${N}, 1fr)`,
          gap: 0,
        }}
      >
        {Array.from({ length: N * N }, (_, i) => (
          <div
            key={i}
            style={{
              border: "1px solid hsl(158 64% 52% / 0.14)",
              background: "hsl(220 18% 9% / 0.5)",
            }}
          />
        ))}
      </div>

      {/* paths + endpoints */}
      <svg viewBox={`0 0 ${N * size} ${N * size}`} width="100%" height="100%"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Object.keys(paths).map((cid) => {
          const p = paths[cid];
          if (!p || p.length < 2) return null;
          const pts = p.map(centre).map(([x, y]) => `${x},${y}`).join(" ");
          return (
            <polyline key={cid} points={pts} fill="none" stroke={colorOf(cid)}
              strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
              style={{ filter: `drop-shadow(0 0 5px ${colorOf(cid)})` }} />
          );
        })}
        {colors.map((col) =>
          endpoints[col.id].map((cell, k) => {
            const [x, y] = centre(cell);
            return (
              <g key={col.id + k}>
                <circle cx={x} cy={y} r="30" fill={col.c} opacity="0.22" />
                <circle cx={x} cy={y} r="18" fill={col.c}
                  style={{ filter: `drop-shadow(0 0 6px ${col.c})` }} />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLE 3 — PIPES (rotate the pipes / Net): rotate every tile so power from
// the source reaches every pipe. Generated from a spanning tree, so it is
// always solvable, and pipes light up as power flows.
// ═══════════════════════════════════════════════════════════════════════════
function rot1(p) {
  return { N: p.W, E: p.N, S: p.E, W: p.S };
}
function rotN(p, n) {
  let q = { ...p };
  const t = ((n % 4) + 4) % 4;
  for (let i = 0; i < t; i++) q = rot1(q);
  return q;
}

function genPipes() {
  const N = 4;
  const cells = N * N;
  const idx = (r, c) => r * N + c;
  const ports = Array.from({ length: cells }, () => ({ N: false, E: false, S: false, W: false }));
  const visited = new Array(cells).fill(false);
  const start = Math.floor(Math.random() * cells);
  const stack = [start];
  visited[start] = true;
  const DIRS = [
    [-1, 0, "N", "S"],
    [1, 0, "S", "N"],
    [0, -1, "W", "E"],
    [0, 1, "E", "W"],
  ];
  // randomized DFS spanning tree — connects every cell
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / N), c = cur % N;
    const opts = DIRS.map(([dr, dc, d, od]) => {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) return null;
      const ni = idx(nr, nc);
      if (visited[ni]) return null;
      return { ni, d, od };
    }).filter(Boolean);
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const pick = opts[Math.floor(Math.random() * opts.length)];
    ports[cur][pick.d] = true;
    ports[pick.ni][pick.od] = true;
    visited[pick.ni] = true;
    stack.push(pick.ni);
  }
  return { N, ports, source: start };
}

function computePowered(N, eff, source) {
  const seen = new Set([source]);
  const st = [source];
  while (st.length) {
    const cur = st.pop();
    const r = Math.floor(cur / N), c = cur % N;
    const step = (cond, ni, d, od) => {
      if (cond && !seen.has(ni) && eff[cur][d] && eff[ni][od]) {
        seen.add(ni);
        st.push(ni);
      }
    };
    step(r > 0, cur - N, "N", "S");
    step(r < N - 1, cur + N, "S", "N");
    step(c > 0, cur - 1, "W", "E");
    step(c < N - 1, cur + 1, "E", "W");
  }
  return seen;
}

function PipesPuzzle({ onSolvedChange, locked }) {
  const puzzle = useMemo(() => genPipes(), []);
  const { N, ports, source } = puzzle;
  const cells = N * N;

  const [rot, setRot] = useState(() => {
    let r;
    do {
      r = Array.from({ length: cells }, () => Math.floor(Math.random() * 4));
    } while (computePowered(N, ports.map((p, i) => rotN(p, r[i])), source).size === cells);
    return r;
  });

  const eff = rot.map((rr, i) => rotN(ports[i], rr));
  const powered = computePowered(N, eff, source);
  const solved = powered.size === cells;

  useEffect(() => {
    onSolvedChange(solved);
  }, [solved, onSolvedChange]);

  const rotate = (i) => {
    if (locked) return;
    setRot((prev) => prev.map((v, j) => (j === i ? (v + 1) % 4 : v)));
  };

  const cellSize = "clamp(52px, 17vw, 72px)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 2 }}>
      {Array.from({ length: cells }, (_, i) => {
        const p = ports[i];
        const isSrc = i === source;
        const on = powered.has(i);
        const col = isSrc ? "hsl(43 96% 56%)" : on ? "hsl(158 64% 52%)" : "hsl(158 64% 52% / 0.32)";
        const lines = [];
        if (p.N) lines.push("M20,20 L20,0");
        if (p.S) lines.push("M20,20 L20,40");
        if (p.E) lines.push("M20,20 L40,20");
        if (p.W) lines.push("M20,20 L0,20");
        return (
          <motion.div
            key={i}
            onClick={() => rotate(i)}
            className="rounded-sm select-none"
            style={{
              width: cellSize,
              height: cellSize,
              cursor: locked ? "default" : "pointer",
              background: on ? "hsl(158 64% 52% / 0.06)" : "hsl(220 18% 9% / 0.6)",
              border: `1px solid ${on ? "hsl(158 64% 52% / 0.4)" : "hsl(158 64% 52% / 0.12)"}`,
              transition: "background .3s, border .3s",
            }}
            animate={{ rotate: rot[i] * 90 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            whileTap={locked ? {} : { scale: 0.9 }}
          >
            <svg viewBox="0 0 40 40" width="100%" height="100%"
              style={{ filter: on ? `drop-shadow(0 0 4px ${col})` : "none" }}>
              {lines.map((d, k) => (
                <path key={k} d={d} stroke={col} strokeWidth="3" strokeLinecap="round" fill="none" />
              ))}
              <circle cx="20" cy="20" r={isSrc ? 6 : 4} fill={isSrc ? col : on ? col : "hsl(158 64% 52% / 0.25)"}
                stroke={col} strokeWidth={isSrc ? 1.5 : 0} />
              {isSrc && <circle cx="20" cy="20" r="2" fill="#04120c" />}
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
export default function CircuitPuzzleFloor({ floor, floorData, onAdvance }) {
  const [style] = useState(() => {
    const styles = ["wires", "flow", "pipes"];
    return styles[Math.floor(Math.random() * styles.length)];
  });
  const [solved, setSolved] = useState(false);
  const [locked, setLocked] = useState(false);

  // Disable mobile pull-to-refresh while the drag puzzle is on screen
  // (overscroll-behavior only affects touch — desktop is unaffected).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevH = html.style.overscrollBehaviorY;
    const prevB = body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "contain";
    body.style.overscrollBehaviorY = "contain";
    return () => {
      html.style.overscrollBehaviorY = prevH;
      body.style.overscrollBehaviorY = prevB;
    };
  }, []);

  const onSolvedChange = useCallback((s) => setSolved(s), []);

  const lockIn = () => {
    if (!solved || locked) return;
    setLocked(true);
    setTimeout(() => onAdvance(floorData.nextFloor), 1200);
  };

  const instructions =
    style === "wires"
      ? "Drag each node on the left to the matching-colour node on the right."
      : style === "flow"
      ? "Drag from a glowing node to its matching pair. Connect every colour."
      : "Tap each pipe to rotate it. Power must flow from the source to every pipe.";

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center px-4 py-8"
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ⚡ Circuit Floor — Pre-Boss
        </span>
      </div>

      <div className="terminal-border rounded-md p-4 mb-6 max-w-lg w-full text-center">
        <p className="text-accent glow-amber font-mono-game text-xs tracking-widest uppercase mb-1">
          ⚠ Restore the Circuit
        </p>
        <p className="text-foreground/80 font-mono-game text-sm leading-relaxed">{instructions}</p>
        <p className="text-muted-foreground font-mono-game text-xs mt-2">
          When every wire is live, lock in the circuit.
        </p>
      </div>

      {/* Puzzle board */}
      <div
        className="relative border border-primary/20 rounded-md p-3 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.4)", boxShadow: "0 0 30px hsl(158 64% 52% / 0.05)" }}
      >
        {style === "wires" ? (
          <WiresPuzzle onSolvedChange={onSolvedChange} locked={locked} />
        ) : style === "flow" ? (
          <FlowPuzzle onSolvedChange={onSolvedChange} locked={locked} />
        ) : (
          <PipesPuzzle onSolvedChange={onSolvedChange} locked={locked} />
        )}
      </div>

      {/* Lock-in button */}
      <div className="mt-7 h-16 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!locked && solved && (
            <motion.button
              key="lock"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: [
                  "0 0 14px hsl(158 64% 52% / 0.35)",
                  "0 0 30px hsl(158 64% 52% / 0.7)",
                  "0 0 14px hsl(158 64% 52% / 0.35)",
                ],
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ boxShadow: { duration: 1.6, repeat: Infinity }, default: { duration: 0.3 } }}
              onClick={lockIn}
              className="font-vt323 text-2xl tracking-[0.3em] uppercase px-8 py-3 rounded border border-primary text-primary"
              style={{ background: "hsl(158 64% 52% / 0.08)", textShadow: "0 0 10px hsl(158 64% 52%)" }}
            >
              ⚡ Lock In
            </motion.button>
          )}
          {locked && (
            <motion.p
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono-game text-sm text-primary glow-green tracking-widest uppercase"
            >
              ✓ Circuit Locked — Boss Unlocked
            </motion.p>
          )}
          {!locked && !solved && (
            <motion.p
              key="hint"
              className="font-mono-game text-[11px] text-muted-foreground/30 tracking-widest text-center"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              connect every wire to power the circuit
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
