"use client";

import { useEffect, useState } from "react";
import type { RendererProps } from "./types";

export interface CountdownPayload {
  targetIso: string;
  format?: "dhms" | "hms" | "ms";
  expiredText?: string;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, total };
}

export function CountdownRenderer({ payload, overrides }: RendererProps<CountdownPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const target = new Date(p.targetIso || Date.now()).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remaining = parts(target - now);
  const expired = remaining.total === 0;
  const fmt = p.format ?? "dhms";
  let label = "";
  if (expired) label = p.expiredText ?? "00:00";
  else if (fmt === "ms") {
    const totalM = Math.floor(remaining.total / 60);
    label = `${String(totalM).padStart(2, "0")}:${String(remaining.s).padStart(2, "0")}`;
  } else if (fmt === "hms") {
    const totalH = Math.floor(remaining.total / 3600);
    label = `${String(totalH).padStart(2, "0")}:${String(remaining.m).padStart(2, "0")}:${String(remaining.s).padStart(2, "0")}`;
  } else {
    label = `${remaining.d}d ${String(remaining.h).padStart(2, "0")}:${String(remaining.m).padStart(2, "0")}:${String(remaining.s).padStart(2, "0")}`;
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        backgroundColor: p.bgColor ?? "transparent",
        color: p.color ?? "#111",
        fontFamily: p.fontFamily ?? "ui-monospace, monospace",
        fontWeight: 700,
        containerType: "size",
      }}
    >
      <div style={{ fontSize: "min(20cqw, 50cqh)", lineHeight: 1 }}>{label}</div>
    </div>
  );
}
