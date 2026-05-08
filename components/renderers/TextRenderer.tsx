"use client";

import type { RendererProps } from "./types";

export interface TextPayload {
  text: string;
  fontFamily?: string;
  fontWeight?: number | string;
  color?: string;
  align?: "left" | "center" | "right";
  bgColor?: string;
  padding?: number;
  borderRadius?: number;
  fitToBox?: boolean;
}

export function TextRenderer({ payload, overrides }: RendererProps<TextPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        backgroundColor: p.bgColor ?? "transparent",
        color: p.color ?? "#111",
        fontFamily: p.fontFamily ?? "inherit",
        fontWeight: p.fontWeight ?? 600,
        textAlign: p.align ?? "center",
        padding: p.padding ?? 16,
        borderRadius: p.borderRadius ?? 0,
      }}
    >
      <span
        style={{
          fontSize: p.fitToBox ? "min(20cqw, 80cqh)" : undefined,
          containerType: p.fitToBox ? "size" : undefined,
          width: "100%",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {p.text || "Text"}
      </span>
    </div>
  );
}
