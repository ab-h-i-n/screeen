"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QRCodeSVG } from "qrcode.react";
import { Copy, RotateCcw, ExternalLink, Check } from "lucide-react";

interface Props {
  secret: string;
  sessionId: string;
  sourceType: "camera" | "screen";
}

export function StreamSessionPanel({ secret, sessionId, sourceType }: Props) {
  const session = useQuery(api.signaling.getBySession, { sessionId });
  const reset = useMutation(api.signaling.reset);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = useMemo(
    () => (origin ? `${origin}/share#s=${sessionId}` : ""),
    [origin, sessionId],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const status = session?.status ?? "waiting";
  const ua = session?.publisherUserAgent;
  const isLive = status === "live";

  return (
    <div className="my-2 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isLive
              ? "bg-green-500"
              : status === "ended"
                ? "bg-zinc-400"
                : "animate-pulse bg-amber-500"
          }`}
        />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {isLive
            ? `${sourceType === "screen" ? "Screen" : "Camera"} live`
            : `Waiting for ${sourceType === "screen" ? "screen share" : "camera"}`}
        </span>
        {ua && (
          <span className="ml-auto truncate text-[10px] text-muted-foreground">
            {parseAgent(ua)}
          </span>
        )}
      </div>

      {!isLive && (
        <>
          <div className="text-[11px] leading-tight text-amber-900">
            Open this URL on the device whose {sourceType} you want to share
            (phone for camera, laptop for screen). Then click <b>Start sharing</b>.
          </div>

          {/* Big primary action */}
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            <ExternalLink size={12} />
            Open share page (new tab)
          </a>

          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <div className="rounded border bg-white p-1">
              {shareUrl && <QRCodeSVG value={shareUrl} size={96} />}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="text-[10px] text-muted-foreground">
                Or scan with phone:
              </div>
              <div className="flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded bg-white px-1.5 py-1 text-[10px]">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded border bg-white p-1 hover:bg-zinc-50"
                  title="Copy"
                >
                  {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => reset({ secret, sessionId })}
        className="flex items-center gap-1 self-start rounded border bg-white px-2 py-1 text-[10px] hover:bg-zinc-50"
        title="Invalidate this session — publisher must re-share"
      >
        <RotateCcw size={10} /> Reset session
      </button>
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
