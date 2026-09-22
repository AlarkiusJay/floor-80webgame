import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted } from "@/lib/music";

// Floating mute/unmute toggle for the main + how-to screens.
export default function MuteButton() {
  const [muted, setMutedState] = useState(() => isMuted());

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <button
      onClick={toggle}
      // Don't let the click bubble into the hold-to-continue handler.
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? "Unmute music" : "Mute music"}
      title={muted ? "Unmute music" : "Mute music"}
      className="flex items-center justify-center w-9 h-9 rounded border border-primary/25 bg-black/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}
