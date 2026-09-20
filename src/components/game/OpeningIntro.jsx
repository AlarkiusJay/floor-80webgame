import { useState } from "react";
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

  const handleClick = () => {
    if (phase !== "waiting") return;
    setPhase("done");
    setTimeout(() => onDone(), 600);
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ backgroundColor: "#010101", zIndex: 100 }}
      onClick={handleClick}
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
          <span style={{ color: "hsl(158 64% 52%)", textShadow: "0 0 16px hsl(158 64% 52% / 0.6), 0 0 40px hsl(158 64% 52% / 0.2)" }}>FL</span>
          <span style={{ color: "hsl(0 72% 51%)", textShadow: "0 0 14px hsl(0 72% 51% / 0.7), 0 0 40px hsl(0 72% 51% / 0.25)" }}>80</span>
          <span style={{ color: "hsl(158 64% 52%)", textShadow: "0 0 16px hsl(158 64% 52% / 0.6), 0 0 40px hsl(158 64% 52% / 0.2)" }}>R</span>
        </motion.p>

        {/* Looping EKG line */}
        <div className="relative w-80 h-16">
          <HeartbeatLine />
        </div>
      </div>

      {/* Click prompt */}
      <AnimatePresence>
        {phase === "waiting" && (
          <motion.p
            key="prompt"
            className="absolute bottom-12 font-mono-game text-xs tracking-[0.3em] uppercase"
            style={{ color: "hsl(158 64% 52% / 0.45)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            exit={{ opacity: 0 }}
          >
            click anywhere to begin
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}