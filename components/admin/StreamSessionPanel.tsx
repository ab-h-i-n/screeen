"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QRCodeSVG } from "qrcode.react";
import { Copy, RotateCcw } from "lucide-react";

interface Props {
  secret: string;
  sessionId: string;
  sourceType: "camera" | "screen";
}

export function StreamSessionPanel({ secret, sessionId, sourceType }: Props) {
  const session = useQuery(api.signaling.getBySession, { sessionId });
  const reset = useMutation(api.signaling.reset);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = useMemo(
    () => (origin ? `${origin}/share#s=${sessionId}` : ""),
    [origin, sessionId],
  );

  const onCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  };

  const status = session?.status ?? "waiting";
  const ua = session?.publisherUserAgent;

  return (
    <div className="my-2 space-y-2 rounded border bg-amber-50/50 p-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
        {sourceType === "screen" ? "Screen share" : "Camera share"}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "live"
              ? "bg-green-500"
              : status === "ended"
                ? "bg-zinc-400"
                : "bg-amber-500 animate-pulse"
          }`}
        />
        <span className="font-medium uppercase">{status}</span>
        {ua && <span className="truncate text-muted-foreground">— {parseAgent(ua)}</span>}
      </div>
      <div className="flex gap-2">
        <div className="rounded border bg-white p-1">
          {shareUrl && <QRCodeSVG value={shareUrl} size={88} />}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="text-[10px] text-muted-foreground">
            Open this on the device whose {sourceType} you want to share:
          </div>
          <div className="flex items-center gap-1">
            <code className="flex-1 truncate rounded bg-white px-1.5 py-1 text-[10px]">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={onCopy}
              className="rounded border bg-white p-1 hover:bg-zinc-50"
              title="Copy"
            >
              <Copy size={11} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => reset({ secret, sessionId })}
            className="mt-1 flex items-center gap-1 self-start rounded border bg-white px-2 py-1 text-[10px] hover:bg-zinc-50"
            title="Reset session — invalidates current stream"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function parseAgent(ua: string): string {
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "device";
}
