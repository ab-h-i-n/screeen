"use client";

import { useEffect, useState } from "react";
import type { RendererProps } from "./types";

export interface WeatherPayload {
  lat: number;
  lon: number;
  units?: "metric" | "imperial";
  label?: string;
}

interface WeatherData {
  temp: number;
  code: number;
  wind: number;
}

const CODE_ICON: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  61: "🌧️",
  71: "❄️",
  80: "🌧️",
  95: "⛈️",
};

export function WeatherRenderer({ payload, overrides }: RendererProps<WeatherPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (typeof p.lat !== "number" || typeof p.lon !== "number") return;
    const fetchData = async () => {
      try {
        const u = new URL("https://api.open-meteo.com/v1/forecast");
        u.searchParams.set("latitude", String(p.lat));
        u.searchParams.set("longitude", String(p.lon));
        u.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
        if (p.units === "imperial") {
          u.searchParams.set("temperature_unit", "fahrenheit");
          u.searchParams.set("wind_speed_unit", "mph");
        }
        const res = await fetch(u.toString());
        const json = await res.json();
        setData({
          temp: json.current?.temperature_2m,
          code: json.current?.weather_code,
          wind: json.current?.wind_speed_10m,
        });
      } catch {
        /* swallow */
      }
    };
    fetchData();
    const t = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [p.lat, p.lon, p.units]);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center"
      style={{ containerType: "size", color: "#111" }}
    >
      {data ? (
        <>
          <div style={{ fontSize: "min(40cqw, 50cqh)", lineHeight: 1 }}>
            {CODE_ICON[data.code] ?? "🌡️"}
          </div>
          <div
            style={{
              fontSize: "min(20cqw, 25cqh)",
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {Math.round(data.temp)}°
          </div>
          {p.label && (
            <div style={{ fontSize: "min(6cqw, 9cqh)", opacity: 0.6 }}>{p.label}</div>
          )}
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  );
}
