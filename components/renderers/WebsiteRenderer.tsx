"use client";

import { useEffect, useRef } from "react";
import type { RendererProps } from "./types";

export interface WebsitePayload {
  url: string;
}

export function WebsiteRenderer({
  payload,
  overrides,
  isAdmin,
}: RendererProps<WebsitePayload>) {
  const url = overrides?.url ?? payload.url;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  // Set src imperatively so React never touches it during re-renders.
  // Without this, the iframe can be reset to the prop URL on parent
  // re-renders (e.g. throttled layer patches), wiping any in-iframe
  // navigation the user did.
  useEffect(() => {
    if (!iframeRef.current || !url) return;
    if (lastUrlRef.current === url) return;
    iframeRef.current.src = url;
    lastUrlRef.current = url;
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        No URL set
      </div>
    );
  }
  return (
    <div className="relative h-full w-full bg-white">
      <iframe
        ref={iframeRef}
        title="website"
        className="h-full w-full border-0"
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; clipboard-read; clipboard-write"
      />
      {/* Admin canvas needs a click-shield so drag handles work */}
      {isAdmin && <div className="iframe-shield" />}
    </div>
  );
}
