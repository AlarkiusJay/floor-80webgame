import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { generateFloors } from "@/data/generateFloors";
import IntroScreen from "@/components/game/IntroScreen";
import FloorHeader from "@/components/game/FloorHeader";
import HiddenFloor from "@/components/game/HiddenFloor";
import TypedFloor from "@/components/game/TypedFloor";
import MathFloor from "@/components/game/MathFloor";
import CatBossFloor from "@/components/game/CatBossFloor";
import ChaseFloor from "@/components/game/ChaseFloor";
import RickrollFloor from "@/components/game/RickrollFloor";
import CircuitPuzzleFloor from "@/components/game/CircuitPuzzleFloor";
import FinalFloor from "@/components/game/FinalFloor";
import WinScreen from "@/components/game/WinScreen";

export default function Game() {
  const [phase, setPhase] = useState("intro"); // intro | playing | win
  const [currentFloor, setCurrentFloor] = useState("40.5");
  const [transitioning, setTransitioning] = useState(false);
  const floorsRef = useRef(null);

  // Generate floors once per session (on first render)
  if (!floorsRef.current) {
    floorsRef.current = generateFloors();
  }
  const FLOORS = floorsRef.current;

  const floorData = FLOORS[currentFloor];

  const handleStart = () => {
    setCurrentFloor(1);
    setPhase("playing");
  };

  const handleAdvance = (nextFloor) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentFloor(nextFloor);
      setTransitioning(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
  };

  const handleWin = () => {
    setPhase("win");
  };

  const handleRestart = () => {
    floorsRef.current = generateFloors(); // Re-randomize on restart
    setCurrentFloor(1);
    setPhase("intro");
  };

  if (phase === "intro") return <IntroScreen onStart={handleStart} />;
  if (phase === "win") return <WinScreen onRestart={handleRestart} />;

  return (
    <div
      className="min-h-screen scanlines transition-colors duration-700"
      style={{ backgroundColor: floorData?.bg || "#0a0f0d" }}
    >
      {/* Header */}
      <FloorHeader
        currentFloor={currentFloor}
        section={floorData?.section}
        sectionTitle={floorData?.sectionTitle}
      />

      {/* Floor content */}
      <AnimatePresence mode="wait">
        {!transitioning && (
          <motion.div
            key={currentFloor}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {floorData?.type === "hidden" && (
              <HiddenFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "typed" && (
              <TypedFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "math" && (
              <MathFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "rickroll" && (
              <RickrollFloor onAdvance={handleAdvance} />
            )}
            {floorData?.type === "circuit" && (
              <CircuitPuzzleFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "chase" && (
              <ChaseFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "cat" && (
              <CatBossFloor
                floor={currentFloor}
                floorData={floorData}
                onAdvance={handleAdvance}
              />
            )}
            {floorData?.type === "final" && (
              <FinalFloor onWin={handleWin} />
            )}
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}