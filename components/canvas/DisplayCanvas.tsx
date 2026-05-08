"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Layer } from "./Layer";
import { StrokeLayer } from "./StrokeLayer";
import { MoveableLayer } from "./MoveableLayer";
import { throttle } from "@/lib/throttle";

/**
 * Live display surface. Anyone with the URL can drag/resize/rotate
 * layers (geometry only — no content edits, no add/remove). Layers
 * marked `locked` in admin are uneditable here.
 */
export function DisplayCanvas() {
  const display = useQuery(api.display.get);
  const layers = useQuery(api.layers.list);
  const contents = useQuery(api.contents.list);
  const strokes = useQuery(api.strokes.list);
  const heartbeat = useMutation(api.display.heartbeat);
  const ensure = useMutation(api.display.ensure);
  const publicMove = useMutation(api.layers.publicMove);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cursorVisible, setCursorVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<Id<"layers"> | null>(null);

  // Init display row
  useEffect(() => {
    if (display === null) ensure().catch(console.error);
  }, [display, ensure]);

  // Heartbeat
  useEffect(() => {
    const send = () =>
      heartbeat({ agent: navigator.userAgent }).catch(() => {});
    send();
    const t = setInterval(send, 30_000);
    return () => clearInterval(t);
  }, [heartbeat]);

  // Track size for stroke rendering + Moveable
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

  // Auto-hide cursor on idle
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

  // Keyboard shortcuts: F = fullscreen, R = reload, Esc = deselect
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
      } else if (e.key === "Escape") {
        setSelectedId(null);
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

  // Throttle in-flight position updates so display tab and remote
  // viewers see the layer move smoothly without spamming Convex.
  const movePublic = useMemo(
    () =>
      throttle(
        (
          id: Id<"layers">,
          fields: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            rotation?: number;
          },
        ) => {
          publicMove({ id, ...fields }).catch(console.error);
        },
        100,
      ),
    [publicMove],
  );

  const visibleLayers = (layers ?? []).filter((l) => l.visible !== false);

  return (
    <div
      ref={containerRef}
      className={`relative h-screen w-screen overflow-hidden ${
        cursorVisible ? "" : "display-cursor-hidden"
      }`}
      style={{ backgroundColor: display?.background ?? "#ffffff" }}
      onPointerDown={(e) => {
        // Clicking empty surface deselects
        if (e.target === e.currentTarget) setSelectedId(null);
      }}
    >
      {strokes && size.w > 0 && (
        <StrokeLayer strokes={strokes} width={size.w} height={size.h} />
      )}
      {visibleLayers.map((l) => (
        <MoveableLayer
          key={l._id}
          layer={l}
          content={contentMap.get(l.contentId) ?? null}
          surface={containerRef.current}
          selected={selectedId === l._id}
          interactive={true}
          onSelect={() => setSelectedId(l._id)}
          onPatch={(fields) => movePublic(l._id, fields)}
          onCommit={(fields) =>
            publicMove({ id: l._id, ...fields }).catch(console.error)
          }
        />
      ))}
    </div>
  );
}
