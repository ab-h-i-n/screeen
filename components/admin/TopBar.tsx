"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trash2, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  secret: string;
}

export function TopBar({ secret }: Props) {
  const display = useQuery(api.display.get);
  const setBg = useMutation(api.display.setBackground);
  const clearLayers = useMutation(api.layers.clear);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const lastSeen = display?.lastSeenAt;
  const online = lastSeen && now - lastSeen < 60_000;

  return (
    <div className="flex items-center gap-3 border-b bg-zinc-50 px-3 py-1.5 text-xs">
      <span className="font-semibold tracking-tight">screeen</span>
      <span className="text-muted-foreground">/admin</span>

      <div className="ml-4 flex items-center gap-1">
        {online ? (
          <Wifi size={12} className="text-green-600" />
        ) : (
          <WifiOff size={12} className="text-zinc-400" />
        )}
        <span className="text-muted-foreground">
          Display{" "}
          {lastSeen
            ? online
              ? "online"
              : `last seen ${formatDistanceToNow(lastSeen)} ago`
            : "never connected"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Background</span>
          <input
            type="color"
            value={display?.background ?? "#ffffff"}
            onChange={(e) =>
              setBg({ secret, background: e.target.value }).catch(console.error)
            }
            className="h-6 w-8 cursor-pointer rounded border"
          />
        </label>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded border bg-white px-2 py-1 hover:bg-zinc-50"
        >
          <ExternalLink size={11} />
          Open display
        </a>
        <button
          type="button"
          onClick={() => {
            if (confirm("Remove all layers from the display?")) {
              clearLayers({ secret }).catch(console.error);
            }
          }}
          className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={11} />
          Clear layers
        </button>
      </div>
    </div>
  );
}
