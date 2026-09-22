import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import OpeningIntro from "@/components/game/OpeningIntro";
import IntroMenu from "@/components/game/IntroMenu";
import MuteButton from "@/components/game/MuteButton";
import { playTheme, stopTheme } from "@/lib/music";

// Typewriter hook — loops forever, slow
function useTypewriter(text, speed = 80, pauseMs = 2500) {
  const [displayed, setDisplayed] = useState("");
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    let i = 0;
    let timeout;
    const type = () => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        timeout = setTimeout(type, speed);
      } else {
        timeout = setTimeout(() => { i = 0; type(); }, pauseMs);
      }
    };
    type();
    return () => clearTimeout(timeout);
  }, [text, speed, pauseMs]);
  // cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);
  return { displayed, cursor };
}

export default function IntroScreen({ onStart }) {
  const [visible, setVisible] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // Play the theme across the main + how-to screens; stop on entering the game.
  useEffect(() => {
    playTheme();
    return () => stopTheme();
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, [introDone]);

  const warningText = "→ Get a pen and paper. Right now.\n→ Memory is not optional. It is required.\n→ 80 floors. No saves. No checkpoints.\n→ Some answers are hidden in the darkness.\n→ Look carefully. The obvious is rarely correct.";
  const { displayed, cursor } = useTypewriter(warningText, 65, 60000);

  if (!introDone) return <OpeningIntro onDone={() => setIntroDone(true)} />;

  return (
    <div className="min-h-screen bg-[#010101] flex flex-col items-center justify-center relative overflow-x-hidden scanlines py-4 sm:py-0">
      {/* Top-left mute toggle */}
      <MuteButton />

      {/* Top-right menu: Settings / Donate / Credits */}
      <IntroMenu />

      {/* Green ambient screen glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(158 64% 52% / 0.07) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(#1a9e6e 1px, transparent 1px), linear-gradient(90deg, #1a9e6e 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="relative z-10 text-center px-6 max-w-lg"
      >
        {/* Logo — FL80R — glitch loop */}
        <motion.div
          className="relative inline-block mb-1 select-none"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -30 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <motion.p
            className="font-vt323 text-[28px] sm:text-[52px] leading-none"
            style={{ letterSpacing: "0.08em" }}
            animate={{
              x: [0, -3, 2, -1, 0],
              skewX: [0, -2, 1, 0],
              opacity: [1, 0.85, 1, 0.9, 1],
            }}
            transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
          >
            <span style={{ color: "hsl(158 64% 52%)", textShadow: "0 0 16px hsl(158 64% 52% / 0.6), 0 0 40px hsl(158 64% 52% / 0.2)" }}>About </span>
            <span style={{ color: "#ffffff", textShadow: "0 0 12px rgba(255,255,255,0.45), 0 0 34px rgba(255,255,255,0.18)" }}>FL</span>
            <span style={{ color: "#16ff0e", textShadow: "0 0 16px rgba(22,255,14,0.65), 0 0 40px rgba(22,255,14,0.3)" }}>80</span>
            <span style={{ color: "#ffffff", textShadow: "0 0 12px rgba(255,255,255,0.45), 0 0 34px rgba(255,255,255,0.18)" }}>R</span>
          </motion.p>
        </motion.div>

        <motion.p
          className="text-muted-foreground text-xs sm:text-sm tracking-[0.3em] uppercase mb-3 sm:mb-12 font-mono-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          A Puzzle Logic Game
        </motion.p>

        {/* Warning box — typewriter */}
        <motion.div
          className="terminal-border rounded-md p-3 sm:p-5 mb-3 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
        >
          <p className="text-accent glow-amber text-xs tracking-widest uppercase mb-3 font-mono-game">
            ⚠ Before you begin
          </p>
          <p className="text-xs text-foreground/80 font-mono-game whitespace-pre-line min-h-[60px] sm:min-h-[80px]">
            {displayed}
            <span
              className="inline-block w-[2px] h-[1em] bg-primary align-middle ml-[1px]"
              style={{ opacity: cursor ? 1 : 0, transition: "opacity 0.1s" }}
            />
          </p>
        </motion.div>

        <motion.div
          className="border border-accent/20 rounded-md px-3 py-2 sm:px-4 sm:py-3 mb-3 text-left bg-accent/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
        >
          <p className="text-accent glow-amber text-xs tracking-widest uppercase mb-2 font-mono-game">
            💡 Tips &amp; Tricks
          </p>
          <ul className="text-xs text-foreground/50 font-mono-game leading-relaxed space-y-1">
            <li>→ Play with friends — take turns on each floor.</li>
            <li>→ This game is streamer-friendly. Challenge your audience to spot the hidden text.</li>
            <li>→ Write down answers — memory floors will test you later.</li>
          </ul>
        </motion.div>

        <motion.div
          className="border border-primary/20 rounded-md px-3 py-2 sm:px-4 sm:py-3 mb-4 text-left bg-primary/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <p className="text-primary glow-green text-xs tracking-widest uppercase mb-1 font-mono-game">
            ↺ New Session — New Riddles
          </p>
          <p className="text-xs text-foreground/50 font-mono-game leading-relaxed">
            Every time you start a new session — or refresh the page — a completely fresh set of puzzles is generated. No two runs are the same. Boss floors (10, 20, 30, 40, 50, 60, 70) and Floor 80 are fixed and always identical.
          </p>
        </motion.div>

        {/* Floor sections preview */}
        <motion.div
          className="hidden sm:grid grid-cols-4 gap-1.5 mb-6 sm:mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
        >
          {["1-10","11-20","21-30","31-40","41-50","51-60","61-70","71-80"].map((s, i) => (
            <div key={s} className="border border-border/30 rounded px-2 py-1 text-center">
              <p className="text-[9px] text-muted-foreground font-mono-game">{s}</p>
            </div>
          ))}
        </motion.div>

        <motion.button
          onClick={onStart}
          className="relative group font-vt323 text-3xl text-primary border border-primary/40 px-10 py-3 rounded transition-all duration-300 tracking-[0.3em] glow-green"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0, 1, 1],
            boxShadow: [
              "0 0 0px hsl(158 64% 52% / 0)",
              "0 0 18px hsl(158 64% 52% / 0.35)",
              "0 0 6px hsl(158 64% 52% / 0.15)",
              "0 0 18px hsl(158 64% 52% / 0.35)",
            ],
            scale: [1, 1.025, 1, 1.025],
          }}
          transition={{
            opacity: { delay: 2.6, duration: 0.6, times: [0, 0.3, 0.6, 1] },
            boxShadow: { delay: 3.2, duration: 2.2, repeat: Infinity, ease: "easeInOut" },
            scale: { delay: 3.2, duration: 2.2, repeat: Infinity, ease: "easeInOut" },
          }}
          whileTap={{ scale: 0.97 }}
        >
          ENTER THE BUILDING
        </motion.button>

        <motion.p
          className="text-muted-foreground/40 text-xs mt-3 font-mono-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
        >
          80 floors. No mercy. Good luck.
        </motion.p>
      </motion.div>
    </div>
  );
}