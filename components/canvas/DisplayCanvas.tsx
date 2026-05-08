"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Layer } from "./Layer";
import { StrokeLayer } from "./StrokeLayer";

/**
 * Live display surface — fullscreen, no controls.
 * Reactive queries auto-update when admin changes anything.
 */
export function DisplayCanvas() {
  const display = useQuery(api.display.get);
  const layers = useQuery(api.layers.list);
  const contents = useQuery(api.contents.list);
  const strokes = useQuery(api.strokes.list);
  const heartbeat = useMutation(api.display.heartbeat);
  const ensure = useMutation(api.display.ensure);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cursorVisible, setCursorVisible] = useState(true);

  // Init the singleton display row on first load
  useEffect(() => {
    if (display === null) {
      ensure().catch(console.error);
    }
  }, [display, ensure]);

  // Heartbeat
  useEffect(() => {
    const send = () =>
      heartbeat({ agent: navigator.userAgent }).catch(() => {});
    send();
    const t = setInterval(send, 30_000);
    return () => clearInterval(t);
  }, [heartbeat]);

  // Track size for stroke rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Auto-hide cursor after 3s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      setCursorVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setCursorVisible(false), 3000);
    };
    reset();
    window.addEventListener("mousemove", reset);
    return () => {
      window.removeEventListener("mousemove", reset);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === "r" || e.key === "R") {
        location.reload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const contentMap = useMemo(() => {
    const m = new Map();
    if (contents) for (const c of contents) m.set(c._id, c);
    return m;
  }, [contents]);

  const visibleLayers = (layers ?? []).filter((l) => l.visible !== false);

  return (
    <div
      ref={containerRef}
      className={`relative h-screen w-screen overflow-hidden ${
        cursorVisible ? "" : "display-cursor-hidden"
      }`}
      style={{ backgroundColor: display?.background ?? "#ffffff" }}
    >
      {/* Drawing surface */}
      {strokes && size.w > 0 && (
        <StrokeLayer strokes={strokes} width={size.w} height={size.h} />
      )}
      {/* Layers */}
      {visibleLayers.map((l) => (
        <div
          key={l._id}
          className="absolute"
          style={{
            left: `${l.x * 100}%`,
            top: `${l.y * 100}%`,
            width: `${l.width * 100}%`,
            height: `${l.height * 100}%`,
            transform: `rotate(${l.rotation}deg)`,
            transformOrigin: "center center",
            opacity: l.opacity,
            zIndex: l.zIndex + 1,
          }}
        >
          <Layer layer={l} content={contentMap.get(l.contentId) ?? null} />
        </div>
      ))}
    </div>
  );
}
