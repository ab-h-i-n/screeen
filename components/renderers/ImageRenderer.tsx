"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RendererProps } from "./types";

export interface ImagePayload {
  source: "url" | "upload";
  url?: string;
  storageId?: Id<"_storage">;
  fit?: "cover" | "contain" | "fill";
}

export function ImageRenderer({ payload, overrides }: RendererProps<ImagePayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const uploadedUrl = useQuery(
    api.files.getUrl,
    p.source === "upload" && p.storageId ? { storageId: p.storageId } : "skip",
  );
  const src = p.source === "upload" ? uploadedUrl : p.url;
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Image not set
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full select-none"
      style={{ objectFit: p.fit ?? "cover" }}
      draggable={false}
    />
  );
}
