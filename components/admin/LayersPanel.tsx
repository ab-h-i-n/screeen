"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Lock, LockOpen, Eye, EyeOff } from "lucide-react";
import { useEditor } from "@/stores/editor";

interface Props {
  secret: string;
}

export function LayersPanel({ secret }: Props) {
  const layers = useQuery(api.layers.list);
  const contents = useQuery(api.contents.list);
  const patchLayer = useMutation(api.layers.patch);
  const selectedLayerId = useEditor((s) => s.selectedLayerId);
  const setSelectedLayerId = useEditor((s) => s.setSelectedLayerId);

  const labelFor = (l: Doc<"layers">) => {
    const c = contents?.find((c) => c._id === l.contentId);
    return c?.label ?? "(missing)";
  };

  // Show top-most first
  const ordered = [...(layers ?? [])].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="border-t p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Layers ({ordered.length})
      </div>
      <div className="space-y-1">
        {ordered.map((l) => {
          const selected = l._id === selectedLayerId;
          return (
            <div
              key={l._id}
              className={`group flex items-center gap-2 rounded border px-2 py-1 text-xs ${
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-border bg-white hover:bg-zinc-50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedLayerId(l._id)}
                className="flex-1 truncate text-left"
              >
                {labelFor(l)}
              </button>
              <button
                type="button"
                onClick={() =>
                  patchLayer({
                    secret,
                    id: l._id,
                    visible: !l.visible,
                  }).catch(console.error)
                }
                className="rounded p-1 hover:bg-zinc-100"
                title={l.visible ? "Hide" : "Show"}
              >
                {l.visible ? (
                  <Eye size={12} />
                ) : (
                  <EyeOff size={12} className="text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  patchLayer({
                    secret,
                    id: l._id,
                    locked: !l.locked,
                  }).catch(console.error)
                }
                className="rounded p-1 hover:bg-zinc-100"
                title={l.locked ? "Unlock" : "Lock"}
              >
                {l.locked ? (
                  <Lock size={12} className="text-amber-600" />
                ) : (
                  <LockOpen size={12} />
                )}
              </button>
            </div>
          );
        })}
        {ordered.length === 0 && (
          <div className="py-2 text-center text-[10px] text-muted-foreground">
            No layers yet
          </div>
        )}
      </div>
    </div>
  );
}
