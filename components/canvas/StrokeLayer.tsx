"use client";

import { useMemo } from "react";
import { getStroke } from "perfect-freehand";
import type { Doc } from "@/convex/_generated/dataModel";

interface Props {
  strokes: Doc<"strokes">[];
  width: number;
  height: number;
}

function getSvgPathFromStroke(points: number[][]) {
  if (!points.length) return "";
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...points[0], "Q"] as (string | number)[],
  );
  d.push("Z");
  return d.join(" ");
}

export function StrokeLayer({ strokes, width, height }: Props) {
  const paths = useMemo(() => {
    return strokes.map((s) => {
      const inputPts = s.points.map((p) => [
        p.x * width,
        p.y * height,
        p.pressure,
      ]);
      const outline = getStroke(inputPts, {
        size: s.width,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      });
      return {
        id: s._id,
        d: getSvgPathFromStroke(outline),
        color: s.color,
        opacity: s.tool === "highlighter" ? 0.4 : 1,
        blend: s.tool === "highlighter" ? "multiply" : "normal",
      };
    });
  }, [strokes, width, height]);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ zIndex: 0 }}
    >
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill={p.color}
          opacity={p.opacity}
          style={{ mixBlendMode: p.blend as React.CSSProperties["mixBlendMode"] }}
        />
      ))}
    </svg>
  );
}
