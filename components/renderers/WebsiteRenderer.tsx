"use client";

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
        src={url}
        title="website"
        className="h-full w-full border-0"
        // Permissive sandbox for general website embeds. Note: many sites
        // set X-Frame-Options/CSP and won't render in iframes.
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; clipboard-read; clipboard-write"
      />
      {/* Admin canvas needs a click-shield so drag handles work */}
      {isAdmin && <div className="iframe-shield" />}
    </div>
  );
}
