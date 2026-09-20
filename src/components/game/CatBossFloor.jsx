import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function CatBossFloor({ floor, floorData, onAdvance }) {
  const [found, setFound] = useState(false);

  // Random position: 8–88% x, 15–80% y
  const pos = useRef({
    x: 8 + Math.random() * 80,
    y: 15 + Math.random() * 65,
  });

  const handleCatClick = () => {
    if (found) return;
    setFound(true);
    setTimeout(() => onAdvance(floorData.nextFloor), 1000);
  };

  return (
    <motion.div
      key={floor}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0"
      style={{ backgroundColor: floorData.bg || "#0a0f0d", zIndex: 40 }}
    >
      {/* Boss label */}
      <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
        <span className="font-mono-game text-xs text-destructive/60 tracking-widest border border-destructive/20 rounded px-3 py-1">
          ⚠ BOSS FLOOR — find the cat
        </span>
      </div>

      {/* Description */}
      <div className="absolute top-16 left-0 right-0 flex justify-center px-6 pointer-events-none">
        <p className="font-mono-game text-xs text-muted-foreground/40 text-center max-w-sm leading-relaxed">
          {floorData.description}
        </p>
      </div>

      {/* The hidden cat emoji */}
      <div
        className="absolute select-none"
        style={{
          left: `${pos.current.x}%`,
          top: `${pos.current.y}%`,
          transform: "translate(-50%, -50%)",
          cursor: found ? "default" : "pointer",
          padding: "20px",
          zIndex: 50,
        }}
        onClick={handleCatClick}
      >
        <span
          style={{
            fontSize: "1.5rem",
            opacity: found ? 1 : 0.04,
            filter: found ? "drop-shadow(0 0 12px hsl(158 64% 52%))" : "none",
            transition: "opacity 0.3s, filter 0.3s",
            userSelect: "none",
          }}
        >
          🐱
        </span>
      </div>

      {/* Ambient hint */}
      {!found && (
        <motion.p
          className="absolute bottom-8 left-0 right-0 text-center font-mono-game text-[10px] text-muted-foreground/20 tracking-widest"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          a cat is hiding somewhere on this screen...
        </motion.p>
      )}

      {found && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center font-vt323 text-3xl text-primary glow-green tracking-widest"
        >
          🐱 FOUND — ADVANCING...
        </motion.p>
      )}
    </motion.div>
  );
}