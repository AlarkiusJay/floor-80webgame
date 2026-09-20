import { motion } from "framer-motion";
import { TOTAL_FLOORS } from "@/data/floors";

export default function FloorHeader({ currentFloor, section, sectionTitle }) {
  const progress = (currentFloor / TOTAL_FLOORS) * 100;

  return (
    <div className="w-full px-4 pt-4 pb-2 border-b border-border/30">
      <div className="max-w-2xl mx-auto">
        {/* Section + floor info */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-xs tracking-[0.2em] uppercase font-mono-game">
            {section}
          </span>
          <span className="text-muted-foreground text-xs font-mono-game">
            You are on <span className="text-primary glow-green">Floor {currentFloor}</span>
          </span>
        </div>

        {/* Floor title */}
        <motion.h2
          key={currentFloor}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-vt323 text-2xl text-foreground tracking-wider mb-3"
        >
          {sectionTitle}
        </motion.h2>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ boxShadow: "0 0 8px hsl(158 64% 52% / 0.6)" }}
          />
        </div>
        <p className="text-right text-[10px] text-muted-foreground mt-1 font-mono-game">
          {currentFloor} / {TOTAL_FLOORS}
        </p>
      </div>
    </div>
  );
}