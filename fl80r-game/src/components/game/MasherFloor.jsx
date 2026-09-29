import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Floor 60.5 — "The Interlude": a rage-bait button masher.
// 8 buttons, each with its own annoying modifier, cleared in sequence.
// Every mount re-randomizes the target counts (always high, sometimes triple digits).

const BUTTONS = [
  { key: "green",  label: "GREEN",  color: "#16ff0e", mod: "steady",  quip: "no tricks. yet." },
  { key: "cyan",   label: "CYAN",   color: "#22d3ee", mod: "turbo",   quip: "counts in threes. lucky you." },
  { key: "amber",  label: "AMBER",  color: "#fbbf24", mod: "jumpy",   quip: "it won't hold still." },
  { key: "red",    label: "RED",    color: "#ff4d4d", mod: "leaky",   quip: "keep clicking or it drains." },
  { key: "purple", label: "PURPLE", color: "#a855f7", mod: "shrink",  quip: "it shrinks. good luck." },
  { key: "pink",   label: "PINK",   color: "#ff5db1", mod: "flaky",   quip: "some clicks just... don't." },
  { key: "blue",   label: "BLUE",   color: "#3b82f6", mod: "double",  quip: "double-click. single won't do." },
  { key: "white",  label: "WHITE",  color: "#ffffff", mod: "runaway", quip: "it runs from your cursor." },
];

// Always high: 50–129, with a real chance of triple digits.
const rollTarget = () => 50 + Math.floor(Math.random() * 80);
const randPos = () => ({ x: 15 + Math.random() * 70, y: 20 + Math.random() * 60 });

export default function MasherFloor({ floorData, onAdvance }) {
  const targets = useRef(BUTTONS.map(rollTarget));
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [bump, setBump] = useState(0);   // increments to re-key the counter pop
  const [shake, setShake] = useState(0); // increments to trigger a "miss" shake
  const [done, setDone] = useState(false);
  const arenaRef = useRef(null);
  const isCoarse = useRef(false);
  useEffect(() => {
    try { isCoarse.current = window.matchMedia("(pointer: coarse)").matches; } catch { /* ignore */ }
  }, []);

  const btn = BUTTONS[idx];
  const target = targets.current[idx];
  const shrinkScale = btn.mod === "shrink" ? Math.max(0.45, 1 - (count / target) * 0.6) : 1;

  // Reset per-button state when moving to a new button.
  useEffect(() => {
    setCount(0);
    setPos(btn.mod === "jumpy" || btn.mod === "runaway" ? randPos() : { x: 50, y: 50 });
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Leaky" drain: lose 1/sec while this button is active.
  useEffect(() => {
    if (done || btn.mod !== "leaky") return;
    const t = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [idx, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceButton = useCallback(() => {
    if (idx + 1 >= BUTTONS.length) {
      setDone(true);
      setTimeout(() => onAdvance(floorData.nextFloor), 1400);
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, onAdvance, floorData.nextFloor]);

  // Apply an increment of `inc`, handling completion + per-mod side effects.
  const addHit = useCallback(
    (inc) => {
      if (done) return;
      setBump((b) => b + 1);
      setCount((c) => {
        const next = Math.min(target, c + inc);
        if (next >= target) {
          // Defer advance so the counter shows the final number first.
          setTimeout(advanceButton, 220);
        }
        return next;
      });
      if (btn.mod === "jumpy" || (btn.mod === "runaway" && isCoarse.current)) {
        setPos(randPos());
      }
    },
    [btn.mod, target, done, advanceButton]
  );

  // Primary click handler (single-click mods).
  const onClick = useCallback(() => {
    if (btn.mod === "double") return; // handled by onDoubleClick
    if (btn.mod === "flaky" && Math.random() < 0.25) {
      setShake((s) => s + 1);
      return;
    }
    addHit(btn.mod === "turbo" ? 3 : 1);
  }, [btn.mod, addHit]);

  const onDouble = useCallback(() => {
    if (btn.mod !== "double") return;
    addHit(1);
  }, [btn.mod, addHit]);

  // "Runaway" dodge (desktop hover).
  const onArenaMove = useCallback(
    (e) => {
      if (btn.mod !== "runaway" || isCoarse.current || done) return;
      const arena = arenaRef.current;
      if (!arena) return;
      const r = arena.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      const dist = Math.hypot(mx - pos.x, my - pos.y);
      if (dist < 22) setPos(randPos());
    },
    [btn.mod, pos, done]
  );

  const pct = Math.round((count / target) * 100);
  const moving = btn.mod === "jumpy" || btn.mod === "runaway";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="text-primary glow-green font-mono-game text-xs tracking-widest uppercase border border-primary/30 rounded px-2 py-1">
          ★ FLOOR 60.5
        </span>
        <span className="text-muted-foreground font-mono-game text-xs tracking-widest">
          — The Interlude
        </span>
      </div>

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center space-y-3"
        >
          <p className="font-vt323 text-4xl text-primary glow-green tracking-widest">
            ALL BUTTONS PRESSED
          </p>
          <p className="font-mono-game text-xs text-muted-foreground tracking-widest">
            your fingers are free. advancing...
          </p>
        </motion.div>
      ) : (
        <>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {BUTTONS.map((b, i) => (
              <span
                key={b.key}
                title={b.label}
                className="h-2.5 w-2.5 rounded-full border transition-all"
                style={{
                  backgroundColor: i < idx ? b.color : "transparent",
                  borderColor: i === idx ? b.color : "rgba(255,255,255,0.25)",
                  boxShadow: i === idx ? `0 0 8px ${b.color}` : "none",
                  transform: i === idx ? "scale(1.35)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {/* Instruction */}
          <div className="text-center space-y-1">
            <p className="font-mono-game text-sm text-foreground/85 tracking-wide">
              Press the{" "}
              <span style={{ color: btn.color, textShadow: `0 0 10px ${btn.color}` }} className="font-bold">
                {btn.label}
              </span>{" "}
              button{" "}
              <span style={{ color: btn.color }} className="font-bold tabular-nums">{target}</span>{" "}
              times
            </p>
            <p className="font-mono-game text-[11px] text-muted-foreground/50 tracking-widest uppercase">
              button {idx + 1} / {BUTTONS.length} · modifier: {btn.mod} — {btn.quip}
            </p>
          </div>

          {/* Animated counter */}
          <div className="text-center">
            <div className="flex items-end justify-center gap-2 leading-none">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={bump}
                  initial={{ scale: 1.5, y: -4, opacity: 0.6 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="font-vt323 text-6xl tabular-nums"
                  style={{ color: btn.color, textShadow: `0 0 18px ${btn.color}` }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
              <span className="font-vt323 text-3xl text-muted-foreground/50 tabular-nums pb-1">
                / {target}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full max-w-xs mx-auto rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: btn.color, boxShadow: `0 0 8px ${btn.color}` }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </div>

          {/* Arena */}
          <div
            ref={arenaRef}
            onMouseMove={onArenaMove}
            className="relative rounded-md border border-border overflow-hidden"
            style={{ height: "clamp(240px, 42vh, 360px)", background: "rgba(255,255,255,0.015)", touchAction: "manipulation" }}
          >
            {/* Layer 1: position (animates left/top for moving buttons, centered via x/y) */}
            <motion.div
              className="absolute"
              animate={{ left: `${moving ? pos.x : 50}%`, top: `${moving ? pos.y : 50}%` }}
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              style={{ x: "-50%", y: "-50%" }}
            >
              {/* Layer 2: shake (re-keyed per "miss" so the keyframes replay) */}
              <motion.div
                key={`shake-${shake}`}
                animate={{ x: shake ? [0, -8, 8, -5, 5, 0] : 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Layer 3: the button itself (scale = shrink modifier + tap feedback) */}
                <motion.button
                  type="button"
                  onClick={onClick}
                  onDoubleClick={onDouble}
                  animate={{ scale: shrinkScale }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  whileTap={{ scale: shrinkScale * 0.9 }}
                  className="select-none font-vt323 tracking-widest rounded-md border-2 px-6 py-4 text-2xl"
                  style={{
                    color: btn.color,
                    borderColor: btn.color,
                    backgroundColor: `${btn.color}1a`,
                    boxShadow: `0 0 18px ${btn.color}66, inset 0 0 12px ${btn.color}22`,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {btn.label}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>

          <p className="text-center font-mono-game text-[10px] text-muted-foreground/30 tracking-widest">
            no skips. no mercy. finish the sequence.
          </p>
        </>
      )}
    </motion.div>
  );
}
