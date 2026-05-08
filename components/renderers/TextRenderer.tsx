"use client";

import type { RendererProps } from "./types";

export interface TextPayload {
  text: string;
  fontSize?: number; // px
  fontFamily?: string;
  fontWeight?: number | string;
  color?: string;
  align?: "left" | "center" | "right";
  bgColor?: string;
  padding?: number;
  borderRadius?: number;
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
        fontSize: `${p.fontSize ?? 64}px`,
        lineHeight: 1.15,
      }}
    >
      <span
        style={{
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
