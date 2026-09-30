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

// Taunts for the custom right-click menu on the runaway button.
const TAUNTS = [
  "nice try.",
  "you really thought?",
  "the button laughs at you.",
  "cute. keep going.",
  "not in this building.",
  "it sees your cursor.",
  "pinned. now be quick.",
  "so close. not really.",
  "skill issue, honestly.",
  "the cats are watching.",
  "right-click harder.",
  "was that supposed to work?",
];
const FAKE_ITEMS = ["Inspect Element", "Catch the button", "Beg for mercy", "Give up"];

export default function MasherFloor({ floorData, onAdvance }) {
  const targets = useRef(BUTTONS.map(rollTarget));
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [bump, setBump] = useState(0);   // increments to re-key the counter pop
  const [shake, setShake] = useState(0); // increments to trigger a "miss" shake
  const [pressed, setPressed] = useState(false); // brief press-dip feedback
  const [done, setDone] = useState(false);
  const [frozen, setFrozen] = useState(false); // runaway pinned by a right-click
  const [menu, setMenu] = useState(null); // { x, y, text } custom right-click menu
  const arenaRef = useRef(null);
  const freezeTimer = useRef(null);
  const menuTimer = useRef(null);
  const isCoarse = useRef(false);
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    let c = false;
    try { c = window.matchMedia("(pointer: coarse)").matches; } catch { /* ignore */ }
    isCoarse.current = c;
    setCoarse(c);
  }, []);

  // Clean up timers on unmount.
  useEffect(() => () => {
    clearTimeout(freezeTimer.current);
    clearTimeout(menuTimer.current);
  }, []);

  const btn = BUTTONS[idx];
  const target = targets.current[idx];
  const shrinkScale = btn.mod === "shrink" ? Math.max(0.45, 1 - (count / target) * 0.6) : 1;
  const pressScale = shrinkScale * (pressed ? 0.92 : 1);

  // Reset per-button state when moving to a new button.
  useEffect(() => {
    setCount(0);
    setPos(btn.mod === "jumpy" || btn.mod === "runaway" ? randPos() : { x: 50, y: 50 });
    setFrozen(false);
    setMenu(null);
    clearTimeout(freezeTimer.current);
    clearTimeout(menuTimer.current);
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

  // Count on discrete pointer presses only. Using pointerdown (not click)
  // means one count per physical press: holding the mouse or holding Enter
  // (keyboard activation fires "click", never "pointerdown") can't auto-spam.
  const lastTap = useRef(0);
  const onPress = useCallback(
    (e) => {
      if (done) return;
      // Only genuine pointer input counts. Keyboard-synthesized presses report
      // an empty pointerType (or aren't trusted) — reject them so holding Enter
      // or Space can never auto-spam.
      if (!e.isTrusted) return;
      if (!["mouse", "touch", "pen"].includes(e.pointerType)) return;
      if (e.button != null && e.button > 0) return; // ignore right/middle click

      // Brief press-dip for tactile feel (was whileTap, which added a
      // keyboard-activation path we don't want here).
      setPressed(true);
      setTimeout(() => setPressed(false), 90);

      if (btn.mod === "double") {
        // Require two quick presses to score one (the "double-click" button).
        const now = e.timeStamp || performance.now();
        if (now - lastTap.current <= 400) {
          lastTap.current = 0;
          addHit(1);
        } else {
          lastTap.current = now;
        }
        return;
      }

      if (btn.mod === "flaky" && Math.random() < 0.25) {
        setShake((s) => s + 1);
        return;
      }
      addHit(btn.mod === "turbo" ? 3 : 1);
    },
    [btn.mod, addHit, done]
  );

  // Swallow keyboard activation so a focused button can't be Enter/Space-spammed.
  const blockKey = useCallback((e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
    }
  }, []);

  // "Runaway" dodge (desktop hover). Frozen = pinned by a right-click.
  const onArenaMove = useCallback(
    (e) => {
      if (btn.mod !== "runaway" || isCoarse.current || done || frozen) return;
      const arena = arenaRef.current;
      if (!arena) return;
      const r = arena.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      const dist = Math.hypot(mx - pos.x, my - pos.y);
      if (dist < 22) setPos(randPos());
    },
    [btn.mod, pos, done, frozen]
  );

  // Custom right-click: swallow the OS menu, taunt the player, and — on the
  // runaway button — pin it in place for ~1.3s so it can actually be caught.
  const onContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (done) return;
      if (btn.mod === "runaway") {
        setFrozen(true);
        clearTimeout(freezeTimer.current);
        freezeTimer.current = setTimeout(() => setFrozen(false), 1300);
      }
      setMenu({
        x: e.clientX,
        y: e.clientY,
        text: TAUNTS[Math.floor(Math.random() * TAUNTS.length)],
      });
      clearTimeout(menuTimer.current);
      menuTimer.current = setTimeout(() => setMenu(null), 1400);
    },
    [btn.mod, done]
  );

  const pct = Math.round((count / target) * 100);
  const moving = btn.mod === "jumpy" || btn.mod === "runaway";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onContextMenu={onContextMenu}
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
            {btn.mod === "runaway" && !coarse && (
              <p className="font-mono-game text-[11px] text-accent/80 glow-amber tracking-widest">
                psst — right-clicking might help.
              </p>
            )}
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
                  onPointerDown={onPress}
                  onKeyDown={blockKey}
                  tabIndex={-1}
                  animate={{ scale: pressScale }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="relative select-none font-vt323 tracking-widest rounded-md border-2 px-6 py-4 text-2xl"
                  style={{
                    color: frozen ? "hsl(158 64% 52%)" : btn.color,
                    borderColor: frozen ? "hsl(158 64% 52%)" : btn.color,
                    backgroundColor: `${btn.color}1a`,
                    boxShadow: frozen
                      ? "0 0 26px hsl(158 64% 52% / 0.8), inset 0 0 16px hsl(158 64% 52% / 0.35)"
                      : `0 0 18px ${btn.color}66, inset 0 0 12px ${btn.color}22`,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {btn.label}
                  {frozen && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.3em] text-primary glow-green">
                      PINNED
                    </span>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>

          <p className="text-center font-mono-game text-[10px] text-muted-foreground/30 tracking-widest">
            no skips. no mercy. finish the sequence.
          </p>
        </>
      )}

      {/* Custom right-click menu — themed, taunty, purely decorative (no OS menu). */}
      <AnimatePresence>
        {menu && (
          <motion.div
            key={`${menu.x}-${menu.y}-${menu.text}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[220] font-mono-game text-xs"
            style={{
              left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200),
              top: Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 170),
              pointerEvents: "none",
            }}
          >
            <div
              className="w-48 rounded-md border overflow-hidden"
              style={{
                borderColor: "hsl(158 64% 52% / 0.4)",
                backgroundColor: "#050807",
                boxShadow: "0 0 20px hsl(158 64% 52% / 0.25)",
              }}
            >
              <div className="px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase text-primary/80 glow-green border-b border-primary/20">
                » {menu.text}
              </div>
              <div className="py-1">
                {FAKE_ITEMS.map((it) => (
                  <div
                    key={it}
                    className="flex items-center justify-between px-3 py-1.5 text-muted-foreground/45 tracking-wide"
                  >
                    <span>{it}</span>
                    <span className="text-destructive/60">✗</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
