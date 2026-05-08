"use client";

const HASH_KEY = "k";

/** Read admin secret from URL hash fragment (#k=...). */
export function readSecret(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  for (const part of hash.split("&")) {
    const [k, v] = part.split("=");
    if (k === HASH_KEY && v) return decodeURIComponent(v);
  }
  return null;
}

/** Read share session id from URL hash (#s=...). */
export function readSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  for (const part of hash.split("&")) {
    const [k, v] = part.split("=");
    if (k === "s" && v) return decodeURIComponent(v);
  }
  return null;
}
