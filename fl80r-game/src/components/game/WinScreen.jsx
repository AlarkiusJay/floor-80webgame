import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function WinScreen({ onRestart }) {
  const [lines, setLines] = useState([]);
  const allLines = [
    "> SYSTEM: All 80 floors cleared.",
    "> FINAL BOSS: Defeated.",
    "> Memory: Tested. ✓",
    "> Observation: Tested. ✓",
    "> Logic: Tested. ✓",
    "> Patience: Tested. ✓",
    "",
    "> You made it out.",
    "> Most never do.",
    "",
    "> FLOOR80 — CLEARED",
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < allLines.length) {
        setLines(l => [...l, allLines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#010101] flex flex-col items-center justify-center px-6 scanlines">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        <motion.h1
          className="font-vt323 text-7xl text-primary glow-green tracking-widest"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          YOU ESCAPED
        </motion.h1>

        <div className="terminal-border rounded p-6 text-left space-y-1 font-mono-game text-sm">
          {lines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={line.includes("FLOOR80") ? "text-primary glow-green" : line === "" ? "h-2" : "text-foreground/80"}
            >
              {line}
            </motion.p>
          ))}
          {lines.length < allLines.length && (
            <span className="text-primary animate-pulse">█</span>
          )}
        </div>

        {lines.length >= allLines.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <p className="text-muted-foreground font-mono-game text-xs tracking-wider">
              Now that you know the way — can you do it again?
            </p>
            <button
              onClick={onRestart}
              className="font-vt323 text-2xl text-accent border border-accent/40 px-8 py-2 rounded hover:bg-accent/10 transition-all glow-amber tracking-[0.2em]"
            >
              RESTART FROM FLOOR 1
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}