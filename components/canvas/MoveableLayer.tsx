"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { Layer } from "./Layer";
import type { Content, Layer as LayerDoc } from "@/components/renderers/types";
import { clamp } from "@/lib/coords";

const Moveable = dynamic(() => import("react-moveable"), { ssr: false });

interface PatchFields {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

interface Props {
  layer: LayerDoc;
  content: Content | null;
  surface: HTMLDivElement | null;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onPatch: (fields: PatchFields) => void;
  onCommit: (fields: PatchFields) => void;
}

export function MoveableLayer({
  layer,
  content,
  surface,
  selected,
  interactive,
  onSelect,
  onPatch,
  onCommit,
}: Props) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const surfaceW = surface?.clientWidth ?? 0;
  const surfaceH = surface?.clientHeight ?? 0;

  // Px values derived from fractional layer state
  const left = layer.x * surfaceW;
  const top = layer.y * surfaceH;
  const width = layer.width * surfaceW;
  const height = layer.height * surfaceH;

  const toFractional = (px: PatchFields): PatchFields => {
    const out: PatchFields = {};
    if (px.x !== undefined && surfaceW)
      out.x = clamp(px.x / surfaceW, -0.5, 1.5);
    if (px.y !== undefined && surfaceH)
      out.y = clamp(px.y / surfaceH, -0.5, 1.5);
    if (px.width !== undefined && surfaceW)
      out.width = clamp(px.width / surfaceW, 0.02, 2);
    if (px.height !== undefined && surfaceH)
      out.height = clamp(px.height / surfaceH, 0.02, 2);
    if (px.rotation !== undefined) out.rotation = px.rotation;
    return out;
  };

  return (
    <>
      <div
        ref={targetRef}
        data-layer-target
        onPointerDown={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          onSelect();
        }}
        className={`absolute ${selected ? "outline outline-2 outline-blue-500" : ""}`}
        style={{
          left,
          top,
          width,
          height,
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: "center center",
          opacity: layer.opacity,
          zIndex: layer.zIndex + 1,
          cursor: interactive ? (layer.locked ? "not-allowed" : "move") : "default",
        }}
      >
        <Layer layer={layer} content={content} isAdmin />
      </div>

      {selected && interactive && !layer.locked && surface && (
        <Moveable
          target={targetRef}
          container={surface}
          draggable
          resizable
          rotatable
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={1}
          keepRatio={false}
          edge={false}
          origin={false}
          snappable
          snapDirections={{
            top: true,
            left: true,
            bottom: true,
            right: true,
            center: true,
            middle: true,
          }}
          elementGuidelines={Array.from(
            surface.querySelectorAll("[data-layer-target]"),
          )}
          onDrag={({ left: l, top: t }) => {
            if (targetRef.current) {
              targetRef.current.style.left = `${l}px`;
              targetRef.current.style.top = `${t}px`;
            }
            onPatch(toFractional({ x: l, y: t }));
          }}
          onDragEnd={({ lastEvent }) => {
            if (lastEvent)
              onCommit(toFractional({ x: lastEvent.left, y: lastEvent.top }));
          }}
          onResize={({ width: w, height: h, drag }) => {
            onPatch(
              toFractional({
                x: drag.left,
                y: drag.top,
                width: w,
                height: h,
              }),
            );
            if (targetRef.current) {
              targetRef.current.style.width = `${w}px`;
              targetRef.current.style.height = `${h}px`;
              targetRef.current.style.left = `${drag.left}px`;
              targetRef.current.style.top = `${drag.top}px`;
            }
          }}
          onResizeEnd={({ lastEvent }) => {
            if (lastEvent)
              onCommit(
                toFractional({
                  x: lastEvent.drag.left,
                  y: lastEvent.drag.top,
                  width: lastEvent.width,
                  height: lastEvent.height,
                }),
              );
          }}
          onRotate={({ rotation }) => {
            if (targetRef.current) {
              targetRef.current.style.transform = `rotate(${rotation}deg)`;
            }
            onPatch({ rotation });
          }}
          onRotateEnd={({ lastEvent }) => {
            if (lastEvent) onCommit({ rotation: lastEvent.rotation });
          }}
        />
      )}
    </>
  );
}
