"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Layer } from "./Layer";
import { StrokeLayer } from "./StrokeLayer";
import { MoveableLayer } from "./MoveableLayer";
import { useEditor } from "@/stores/editor";
import { CANVAS_ASPECT, clamp } from "@/lib/coords";
import { throttle } from "@/lib/throttle";

interface Props {
  secret: string;
}

interface DraftStroke {
  id: Id<"strokes">;
  points: { x: number; y: number; pressure: number }[];
}

export function AdminCanvas({ secret }: Props) {
  const layers = useQuery(api.layers.list);
  const contents = useQuery(api.contents.list);
  const strokes = useQuery(api.strokes.list);

  const patchLayer = useMutation(api.layers.patch);
  const removeLayer = useMutation(api.layers.remove);
  const setZ = useMutation(api.layers.setZ);
  const beginStroke = useMutation(api.strokes.begin);
  const appendStroke = useMutation(api.strokes.append);
  const removeStroke = useMutation(api.strokes.removeOne);

  const tool = useEditor((s) => s.tool);
  const penColor = useEditor((s) => s.penColor);
  const penWidth = useEditor((s) => s.penWidth);
  const selectedLayerId = useEditor((s) => s.selectedLayerId);
  const setSelectedLayerId = useEditor((s) => s.setSelectedLayerId);
  const showSafeArea = useEditor((s) => s.showSafeArea);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track wrapper size and compute surface size with aspect lock
  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      let w = W;
      let h = w / CANVAS_ASPECT;
      if (h > H) {
        h = H;
        w = h * CANVAS_ASPECT;
      }
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const contentMap = useMemo(() => {
    const m = new Map<Id<"contents">, NonNullable<typeof contents>[number]>();
    if (contents) for (const c of contents) m.set(c._id, c);
    return m;
  }, [contents]);

  // Drawing state (local for performance)
  const draftRef = useRef<DraftStroke | null>(null);
  const [, forceRender] = useState(0);

  const flushPoints = useMemo(
    () =>
      throttle(async (id: Id<"strokes">, points: DraftStroke["points"]) => {
        await appendStroke({ secret, id, points }).catch(console.error);
      }, 100),
    [appendStroke, secret],
  );

  const onPointerDownCanvas = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      if (!surfaceRef.current) return;
      // Only handle if directly on the surface (not on a layer chrome)
      if (e.target !== e.currentTarget && tool === "select") return;

      const rect = surfaceRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left) / rect.width;
      const localY = (e.clientY - rect.top) / rect.height;

      if (tool === "pen" || tool === "highlighter") {
        e.preventDefault();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const initial = [
          { x: localX, y: localY, pressure: e.pressure || 0.5 },
        ];
        try {
          const id = await beginStroke({
            secret,
            color: tool === "highlighter" ? penColor : penColor,
            width: tool === "highlighter" ? penWidth * 2.5 : penWidth,
            tool,
            points: initial,
          });
          draftRef.current = { id, points: initial };
        } catch (err) {
          console.error(err);
        }
      } else if (tool === "eraser") {
        // Hit-test strokes by point distance — naive O(n*m) acceptable at v1
        if (!strokes) return;
        const hit = findStrokeNear(strokes, localX, localY, 0.012);
        if (hit) await removeStroke({ secret, id: hit._id }).catch(console.error);
      } else {
        // select mode: clicking empty surface deselects
        setSelectedLayerId(null);
      }
    },
    [tool, penColor, penWidth, beginStroke, removeStroke, secret, strokes, setSelectedLayerId],
  );

  const onPointerMoveCanvas = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!surfaceRef.current) return;
      const draft = draftRef.current;
      if (!draft) return;
      // Only collect if pointer is captured / button is down
      if (e.buttons === 0) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      const localX = clamp((e.clientX - rect.left) / rect.width);
      const localY = clamp((e.clientY - rect.top) / rect.height);
      // Get all events for high-rate sampling (incl. coalesced events)
      const events = e.nativeEvent.getCoalescedEvents
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];
      const newPts = events.map((ev) => ({
        x: clamp((ev.clientX - rect.left) / rect.width),
        y: clamp((ev.clientY - rect.top) / rect.height),
        pressure: (ev as PointerEvent).pressure || 0.5,
      }));
      if (newPts.length === 0) {
        newPts.push({ x: localX, y: localY, pressure: e.pressure || 0.5 });
      }
      draft.points.push(...newPts);
      forceRender((n) => n + 1);
      flushPoints(draft.id, newPts);
    },
    [flushPoints],
  );

  const onPointerUpCanvas = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      const draft = draftRef.current;
      if (!draft) return;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      try {
        await appendStroke({
          secret,
          id: draft.id,
          points: [],
          finalize: true,
        });
      } catch {
        /* swallow */
      }
      draftRef.current = null;
      forceRender((n) => n + 1);
    },
    [appendStroke, secret],
  );

  // Throttled layer-patch (during drag/resize/rotate)
  const patchLayerThrottled = useMemo(
    () =>
      throttle(
        (
          id: Id<"layers">,
          fields: Parameters<typeof patchLayer>[0] extends infer T ? T : never,
        ) => {
          patchLayer(fields as never).catch(console.error);
        },
        100,
      ),
    [patchLayer],
  );

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (selectedLayerId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        removeLayer({ secret, id: selectedLayerId }).catch(console.error);
        setSelectedLayerId(null);
      }
      if (selectedLayerId && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        setZ({
          secret,
          id: selectedLayerId,
          op: e.key === "]" ? "forward" : "backward",
        }).catch(console.error);
      }
      if (selectedLayerId && (e.key === "{" || e.key === "}")) {
        e.preventDefault();
        setZ({
          secret,
          id: selectedLayerId,
          op: e.key === "}" ? "front" : "back",
        }).catch(console.error);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLayerId, removeLayer, setZ, setSelectedLayerId, secret]);

  // Build the live (committed + draft) strokes list to render
  const strokesToRender = useMemo(() => {
    if (!strokes) return [];
    const draft = draftRef.current;
    if (!draft) return strokes;
    // Update the draft row with local points
    return strokes.map((s) =>
      s._id === draft.id ? { ...s, points: [...s.points, ...draft.points] } : s,
    );
  }, [strokes]);

  return (
    <div ref={wrapperRef} className="relative flex h-full w-full items-center justify-center bg-zinc-100">
      <div
        ref={surfaceRef}
        className="canvas-surface relative bg-white shadow-lg"
        style={{
          width: size.w,
          height: size.h,
          cursor:
            tool === "pen"
              ? "crosshair"
              : tool === "highlighter"
                ? "crosshair"
                : tool === "eraser"
                  ? "cell"
                  : "default",
        }}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={onPointerUpCanvas}
        onPointerCancel={onPointerUpCanvas}
      >
        {/* Strokes behind layers */}
        {size.w > 0 && (
          <StrokeLayer strokes={strokesToRender} width={size.w} height={size.h} />
        )}

        {/* Safe area guide */}
        {showSafeArea && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-blue-400/40"
            style={{
              left: "5%",
              top: "5%",
              right: "5%",
              bottom: "5%",
            }}
          />
        )}

        {/* Layers */}
        {(layers ?? []).map((l) => (
          <MoveableLayer
            key={l._id}
            layer={l}
            content={contentMap.get(l.contentId) ?? null}
            surface={surfaceRef.current}
            selected={selectedLayerId === l._id}
            interactive={tool === "select"}
            onSelect={() => setSelectedLayerId(l._id)}
            onPatch={(fields) =>
              patchLayerThrottled(l._id, { secret, id: l._id, ...fields } as never)
            }
            onCommit={(fields) =>
              patchLayer({ secret, id: l._id, ...fields }).catch(console.error)
            }
          />
        ))}
      </div>
    </div>
  );
}

function findStrokeNear(
  strokes: { _id: Id<"strokes">; points: { x: number; y: number }[] }[],
  x: number,
  y: number,
  tol: number,
) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    for (const p of s.points) {
      if (Math.abs(p.x - x) < tol && Math.abs(p.y - y) < tol) return s;
    }
  }
  return null;
}
