"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function SplashVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  if (reduceMotion && visible) {
    setVisible(false);
  }

  // onDone() touches the parent's state, so it belongs in an effect rather
  // than being called during render.
  useEffect(() => {
    if (!visible) {
      onDone();
    }
  }, [visible, onDone]);

  function finish() {
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <video
            ref={videoRef}
            className="size-full object-cover"
            src="/splash.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={finish}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />

          <button
            type="button"
            onClick={finish}
            className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-white/10 sm:right-8 sm:top-8"
          >
            Skip
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
