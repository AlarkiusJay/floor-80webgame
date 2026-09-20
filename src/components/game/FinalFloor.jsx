import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TARGET_SUM = 4152026;

// Generate numbers that add up to TARGET_SUM, scattered invisibly
function generateNumbers() {
  // Split the target into 7 parts that sum to TARGET_SUM
  const parts = [1000000, 1000000, 1000000, 500000, 400000, 200000, 52026];
  // Shuffle positions
  return parts.map((value, i) => ({
    id: i,
    value,
    x: 5 + Math.random() * 85,
    y: 10 + Math.random() * 78,
    collected: false,
  }));
}

export default function FinalFloor({ onWin }) {
  const [numbers] = useState(() => generateNumbers());
  const [collected, setCollected] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | wrong | countdown
  const [countdown, setCountdown] = useState(20);
  const [flashbang, setFlashbang] = useState(false);
  const countdownRef = useRef(null);

  const collectedSum = collected.reduce((a, b) => a + b, 0);
  const collectedIds = new Set(collected.map((_, i) => i));

  const handleNumberClick = (num) => {
    if (collectedIds.has(num.id)) return;
    setCollected(prev => [...prev, num.value]);
    numbers[num.id].collected = true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const entered = parseInt(input.trim(), 10);
    if (entered === TARGET_SUM) {
      setStatus("countdown");
    } else {
      setStatus("wrong");
      setTimeout(() => setStatus("idle"), 1400);
      setInput("");
    }
  };

  // Countdown logic
  useEffect(() => {
    if (status !== "countdown") return;
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          // Flashbang then redirect
          setFlashbang(true);
          setTimeout(() => {
            window.location.href = "https://www.theuselessweb.com/";
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [status]);

  return (
    <div className="fixed inset-0" style={{ backgroundColor: "#010101", zIndex: 40 }}>
      {/* Flashbang overlay */}
      <AnimatePresence>
        {flashbang && (
          <motion.div
            className="fixed inset-0 z-[9999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ backgroundColor: "white" }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-10">
        <span className="font-mono-game text-xs text-destructive/70 tracking-widest border border-destructive/20 rounded px-3 py-1">
          ⚠ FLOOR 80 — THE FINAL FLOOR
        </span>
        <p className="font-vt323 text-xl text-foreground/40 tracking-widest">
          Find the invisible numbers. Add them up. Enter the sum.
        </p>
      </div>

      {/* Sum display */}
      <div className="absolute top-24 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="font-vt323 text-3xl text-primary glow-green tracking-widest">
          {collectedSum > 0 ? `SUM: ${collectedSum.toLocaleString()}` : ""}
        </div>
      </div>

      {/* Invisible numbers scattered on screen */}
      {numbers.map((num) => (
        <div
          key={num.id}
          className="absolute select-none z-20"
          style={{
            left: `${num.x}%`,
            top: `${num.y}%`,
            transform: "translate(-50%, -50%)",
            padding: "16px 20px",
            cursor: num.collected ? "default" : "pointer",
          }}
          onClick={() => handleNumberClick(num)}
        >
          <span
            className="font-vt323 text-2xl tracking-widest transition-all duration-300"
            style={{
              color: num.collected ? "hsl(158 64% 52%)" : "rgba(255,255,255,0.035)",
              textShadow: num.collected ? "0 0 12px hsl(158 64% 52%)" : "none",
              userSelect: "none",
            }}
          >
            {num.value.toLocaleString()}
          </span>
        </div>
      ))}

      {/* Input form */}
      {status !== "countdown" && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4 z-30">
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-sm">
            <label className="text-muted-foreground text-xs tracking-widest uppercase font-mono-game">
              Enter the total sum
            </label>
            <div className="flex gap-2 w-full">
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="?"
                autoComplete="off"
                className="flex-1 bg-muted border border-border rounded px-4 py-3 font-mono-game text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors text-center"
                style={{
                  borderColor: status === "wrong" ? "hsl(0 72% 51%)" : undefined,
                }}
              />
              <button
                type="submit"
                className="font-vt323 text-xl px-5 py-2 border border-primary/40 text-primary rounded hover:bg-primary/10 transition-all tracking-widest"
              >
                ENTER
              </button>
            </div>
            <AnimatePresence mode="wait">
              {status === "wrong" && (
                <motion.p key="wrong" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-destructive font-mono-game text-sm">
                  ✗ Incorrect sum. Keep looking.
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </div>
      )}

      {/* Countdown overlay */}
      {status === "countdown" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center z-30 gap-6"
        >
          <p className="font-vt323 text-2xl text-primary glow-green tracking-widest">
            ✓ CORRECT — YOU ESCAPED FL80R
          </p>
          <p className="font-mono-game text-xs text-muted-foreground tracking-widest uppercase">
            This floor will self-destruct in
          </p>
          <motion.p
            key={countdown}
            initial={{ scale: 1.4, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-vt323 text-[8rem] leading-none text-destructive glow-red"
          >
            {countdown}
          </motion.p>
        </motion.div>
      )}

      {/* Ambient hint */}
      {status === "idle" && collected.length === 0 && (
        <motion.p
          className="absolute bottom-6 left-0 right-0 text-center font-mono-game text-[10px] text-muted-foreground/20 tracking-widest pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          something is hidden in the darkness... tap around
        </motion.p>
      )}
    </div>
  );
}