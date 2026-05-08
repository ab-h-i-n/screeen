"use client";

import { useMemo } from "react";
import type { RendererProps } from "./types";

export interface IframeHtmlPayload {
  html: string;
}

export function IframeHtmlRenderer({
  payload,
  overrides,
  isAdmin,
}: RendererProps<IframeHtmlPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const blobUrl = useMemo(() => {
    const blob = new Blob([p.html ?? ""], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [p.html]);

  return (
    <div className="relative h-full w-full bg-white">
      <iframe
        src={blobUrl}
        title="custom html"
        className="h-full w-full border-0"
        sandbox="allow-scripts"
      />
      {isAdmin && <div className="iframe-shield" />}
    </div>
  );
}
