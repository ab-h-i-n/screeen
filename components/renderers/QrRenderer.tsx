"use client";

import { QRCodeSVG } from "qrcode.react";
import type { RendererProps } from "./types";

export interface QrPayload {
  data: string;
  fgColor?: string;
  bgColor?: string;
  caption?: string;
}

export function QrRenderer({ payload, overrides }: RendererProps<QrPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
      style={{ backgroundColor: p.bgColor ?? "#ffffff", containerType: "size" }}
    >
      <div className="flex flex-1 items-center justify-center">
        <QRCodeSVG
          value={p.data || "https://example.com"}
          fgColor={p.fgColor ?? "#000000"}
          bgColor={p.bgColor ?? "#ffffff"}
          level="M"
          style={{ width: "85%", height: "85%" }}
        />
      </div>
      {p.caption && (
        <div
          style={{
            fontSize: "min(6cqw, 10cqh)",
            color: p.fgColor ?? "#111",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {p.caption}
        </div>
      )}
    </div>
  );
}
