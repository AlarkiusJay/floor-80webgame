import { Home, Youtube } from "lucide-react";
import MuteButton from "@/components/game/MuteButton";

const HUB_URL = "https://www.fl80r.party/hub";
const YOUTUBE_URL = "https://www.youtube.com/@Floor80Party";

// Fixed top-left cluster: mute toggle + a link to the FL80R hub.
export default function TopLeftControls() {
  return (
    <div className="fixed top-4 left-4 z-[120] flex items-center gap-2">
      <MuteButton />
      <a
        href={HUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        // Don't let the click bubble into the hold-to-continue handler.
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Open the FL80R hub"
        title="FL80R Hub"
        className="flex items-center justify-center w-9 h-9 rounded border border-primary/25 bg-black/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
      >
        <Home size={16} />
      </a>
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="FL80R on YouTube"
        title="YouTube"
        className="flex items-center justify-center w-9 h-9 rounded border border-primary/25 bg-black/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
      >
        <Youtube size={16} />
      </a>
    </div>
  );
}
