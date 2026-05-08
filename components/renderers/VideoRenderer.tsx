"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RendererProps } from "./types";

export interface VideoPayload {
  source: "url" | "upload";
  url?: string;
  storageId?: Id<"_storage">;
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
}

function toEmbed(url: string): { embed: string; isIframe: boolean } | null {
  try {
    const u = new URL(url);
    // YouTube: youtu.be/X, youtube.com/watch?v=X, youtube.com/embed/X
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return { embed: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`, isIframe: true };
      if (u.pathname.startsWith("/embed/")) return { embed: url, isIframe: true };
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { embed: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`, isIframe: true };
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      if (id) return { embed: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1`, isIframe: true };
    }
  } catch {
    return null;
  }
  return { embed: url, isIframe: false };
}

export function VideoRenderer({
  payload,
  overrides,
  isAdmin,
}: RendererProps<VideoPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const uploadedUrl = useQuery(
    api.files.getUrl,
    p.source === "upload" && p.storageId ? { storageId: p.storageId } : "skip",
  );

  if (p.source === "upload") {
    if (!uploadedUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/60">
          Loading…
        </div>
      );
    }
    return (
      <video
        key={uploadedUrl}
        src={uploadedUrl}
        className="h-full w-full bg-black"
        autoPlay={p.autoplay !== false}
        muted={p.muted !== false}
        loop={p.loop !== false}
        playsInline
        controls={false}
      />
    );
  }

  if (!p.url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Video URL not set
      </div>
    );
  }

  const parsed = toEmbed(p.url);
  if (parsed?.isIframe) {
    return (
      <div className="relative h-full w-full bg-black">
        <iframe
          src={parsed.embed}
          title="video"
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
        />
        {isAdmin && <div className="iframe-shield" />}
      </div>
    );
  }

  return (
    <video
      src={p.url}
      className="h-full w-full bg-black"
      autoPlay={p.autoplay !== false}
      muted={p.muted !== false}
      loop={p.loop !== false}
      playsInline
      controls={false}
    />
  );
}
