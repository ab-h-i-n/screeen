"use client";

import { useEffect, useState } from "react";
import { DisplayCanvas } from "@/components/canvas/DisplayCanvas";

export default function DisplayPage() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // If already in fullscreen (e.g. kiosk mode), skip the prompt
    if (
      window.matchMedia("(display-mode: fullscreen)").matches ||
      document.fullscreenElement
    ) {
      setUnlocked(true);
    }
  }, []);

  if (!unlocked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <button
          onClick={async () => {
            try {
              await document.documentElement.requestFullscreen();
            } catch {
              /* autoplay-only environments may block; proceed anyway */
            }
            setUnlocked(true);
          }}
          className="rounded-lg border bg-black px-6 py-3 text-base font-medium text-white shadow hover:bg-zinc-800"
        >
          Enter fullscreen
        </button>
      </div>
    );
  }

  return <DisplayCanvas />;
}
