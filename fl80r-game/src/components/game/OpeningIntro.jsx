import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SVG heartbeat/EKG path that loops forever
function HeartbeatLine() {
  return (
    <motion.svg
      width="320"
      height="60"
      viewBox="0 0 320 60"
      className="absolute"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <motion.path
        d="M0,30 L80,30 L95,30 L105,5 L115,55 L125,15 L135,30 L160,30 L240,30 L320,30"
        fill="none"
        stroke="hsl(158 64% 52%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: "drop-shadow(0 0 6px hsl(158 64% 52% / 0.8)) drop-shadow(0 0 14px hsl(158 64% 52% / 0.4))",
        }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1, 1, 0],
          opacity:    [0, 1, 1, 0],
        }}
        transition={{
          duration: 2.2,
          ease: "easeInOut",
          times: [0, 0.45, 0.75, 1],
          repeat: Infinity,
          repeatDelay: 0.6,
        }}
      />
    </motion.svg>
  );
}

export default function OpeningIntro({ onDone }) {
  const [phase, setPhase] = useState("waiting"); // waiting | done
  const startedRef = useRef(false);

  const advance = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("done");
    setTimeout(() => onDone(), 600);
  };

  // Continue on Enter
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: "#010101", zIndex: 100 }}
      animate={{ opacity: phase === "done" ? 0 : 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#1a9e6e 1px, transparent 1px), linear-gradient(90deg, #1a9e6e 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient green glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(158 64% 52% / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* FL80R Logo — same style as IntroScreen */}
      <div className="relative flex flex-col items-center gap-6">
        <motion.p
          className="font-vt323 text-[52px] sm:text-[120px] leading-none select-none"
          style={{
            transform: "scaleX(0.55) scaleY(1.3)",
            letterSpacing: "-0.04em",
          }}
          animate={{
            x: [0, -3, 2, -1, 0],
            skewX: [0, -2, 1, 0],
            opacity: [1, 0.85, 1, 0.9, 1],
          }}
          transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
        >
          <span style={{ color: "#ffffff", textShadow: "0 0 12px rgba(255,255,255,0.45), 0 0 34px rgba(255,255,255,0.18)" }}>FL</span>
          <span style={{ color: "#16ff0e", textShadow: "0 0 16px rgba(22,255,14,0.65), 0 0 40px rgba(22,255,14,0.3)" }}>80</span>
          <span style={{ color: "#ffffff", textShadow: "0 0 12px rgba(255,255,255,0.45), 0 0 34px rgba(255,255,255,0.18)" }}>R</span>
        </motion.p>

        {/* Looping EKG line */}
        <div className="relative w-80 h-16">
          <HeartbeatLine />
        </div>
      </div>

      {/* Continue prompt */}
      <AnimatePresence>
        {phase === "waiting" && (
          <motion.div
            key="prompt"
            className="absolute bottom-12 flex items-center gap-2.5 font-mono-game text-xs tracking-[0.3em] uppercase"
            style={{ color: "hsl(158 64% 52% / 0.45)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            exit={{ opacity: 0 }}
          >
            <span>Press</span>
            <kbd
              className="not-italic normal-case px-2 py-0.5 rounded border leading-none"
              style={{
                borderColor: "hsl(158 64% 52% / 0.5)",
                color: "hsl(158 64% 52%)",
                boxShadow: "0 0 8px hsl(158 64% 52% / 0.2), inset 0 0 6px hsl(158 64% 52% / 0.08)",
                textShadow: "0 0 8px hsl(158 64% 52% / 0.5)",
              }}
            >
              Enter&nbsp;&#9166;
            </kbd>
            <span>to continue</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}