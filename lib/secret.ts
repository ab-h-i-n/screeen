"use client";

const STORAGE_KEY = "screeen.adminSecret";

/** Read admin password from sessionStorage. */
export function readSecret(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSecret(secret: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, secret);
  } catch {
    /* ignore */
  }
}

export function clearSecret(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Read share session id from URL hash (#s=...). Used only by /share. */
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
