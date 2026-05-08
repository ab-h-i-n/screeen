"use client";

import { useEffect, useState } from "react";
import type { RendererProps } from "./types";

export interface ClockPayload {
  format?: "12h" | "24h";
  showSeconds?: boolean;
  showDate?: boolean;
  dateFormat?: "short" | "long";
  timezone?: string;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  fontWeight?: number | string;
}

function formatTime(d: Date, p: ClockPayload): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: p.format === "12h",
    timeZone: p.timezone || undefined,
  };
  if (p.showSeconds) opts.second = "2-digit";
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

function formatDate(d: Date, p: ClockPayload): string {
  const opts: Intl.DateTimeFormatOptions =
    p.dateFormat === "long"
      ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" };
  if (p.timezone) opts.timeZone = p.timezone;
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

export function ClockRenderer({ payload, overrides }: RendererProps<ClockPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = p.showSeconds ? 250 : 1000;
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [p.showSeconds]);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: p.bgColor ?? "transparent",
        color: p.color ?? "#111",
        fontFamily: p.fontFamily ?? "ui-monospace, monospace",
        fontWeight: p.fontWeight ?? 700,
        containerType: "size",
      }}
    >
      <div style={{ fontSize: "min(35cqw, 65cqh)", lineHeight: 1 }}>
        {formatTime(now, p)}
      </div>
      {p.showDate && (
        <div
          style={{
            fontSize: "min(8cqw, 15cqh)",
            opacity: 0.7,
            marginTop: "0.4em",
            fontWeight: 400,
          }}
        >
          {formatDate(now, p)}
        </div>
      )}
    </div>
  );
}
