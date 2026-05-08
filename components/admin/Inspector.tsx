"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useEditor } from "@/stores/editor";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { ContentEditor } from "./ContentEditor";
import { StreamSessionPanel } from "./StreamSessionPanel";

interface Props {
  secret: string;
}

export function Inspector({ secret }: Props) {
  const selectedLayerId = useEditor((s) => s.selectedLayerId);
  const setSelectedLayerId = useEditor((s) => s.setSelectedLayerId);
  const layers = useQuery(api.layers.list);
  const contents = useQuery(api.contents.list);
  const patchLayer = useMutation(api.layers.patch);
  const setZ = useMutation(api.layers.setZ);
  const removeLayer = useMutation(api.layers.remove);

  const layer = layers?.find((l: Doc<"layers">) => l._id === selectedLayerId);
  const content = layer
    ? contents?.find((c: Doc<"contents">) => c._id === layer.contentId) ?? null
    : null;

  if (!layer || !content) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
        Select a layer to edit it
      </div>
    );
  }

  const update = (fields: Partial<Doc<"layers">>) =>
    patchLayer({ secret, id: layer._id, ...fields }).catch(console.error);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{content.label}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {content.type}
          </span>
          <button
            type="button"
            onClick={() => {
              removeLayer({ secret, id: layer._id });
              setSelectedLayerId(null);
            }}
            className="ml-auto rounded p-1 text-rose-600 hover:bg-rose-50"
            title="Delete layer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto p-3 text-xs">
        {/* Z-order */}
        <Row label="Z-order">
          <div className="flex items-center gap-1">
            <IconBtn onClick={() => setZ({ secret, id: layer._id, op: "back" })} title="Send to back">
              <ChevronsDown size={12} />
            </IconBtn>
            <IconBtn onClick={() => setZ({ secret, id: layer._id, op: "backward" })} title="Send backward">
              <ChevronDown size={12} />
            </IconBtn>
            <IconBtn onClick={() => setZ({ secret, id: layer._id, op: "forward" })} title="Bring forward">
              <ChevronUp size={12} />
            </IconBtn>
            <IconBtn onClick={() => setZ({ secret, id: layer._id, op: "front" })} title="Bring to front">
              <ChevronsUp size={12} />
            </IconBtn>
            <span className="ml-2 text-muted-foreground">z={layer.zIndex}</span>
          </div>
        </Row>

        <Row label="Position">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput value={layer.x} onChange={(v) => update({ x: v })} step={0.01} suffix="x" />
            <NumberInput value={layer.y} onChange={(v) => update({ y: v })} step={0.01} suffix="y" />
          </div>
        </Row>

        <Row label="Size">
          <div className="grid grid-cols-2 gap-1">
            <NumberInput value={layer.width} onChange={(v) => update({ width: v })} step={0.01} suffix="w" />
            <NumberInput value={layer.height} onChange={(v) => update({ height: v })} step={0.01} suffix="h" />
          </div>
        </Row>

        <Row label="Rotation">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={layer.rotation}
            onChange={(e) => update({ rotation: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-10 text-right tabular-nums">{Math.round(layer.rotation)}°</span>
        </Row>

        <Row label="Opacity">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity}
            onChange={(e) => update({ opacity: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-10 text-right tabular-nums">{Math.round(layer.opacity * 100)}%</span>
        </Row>

        <Row label="Lock">
          <button
            type="button"
            onClick={() => update({ locked: !layer.locked })}
            className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-zinc-50"
          >
            {layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}
            {layer.locked ? "Locked" : "Unlocked"}
          </button>
        </Row>

        <Row label="Visible">
          <button
            type="button"
            onClick={() => update({ visible: !layer.visible })}
            className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-zinc-50"
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            {layer.visible ? "Visible" : "Hidden"}
          </button>
        </Row>

        <div className="my-2 h-px bg-border" />

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </div>
          <ContentEditor secret={secret} content={content} />
        </div>

        {content.type === "stream" && content.payload?.sessionId && (
          <StreamSessionPanel
            secret={secret}
            sessionId={content.payload.sessionId}
            sourceType={content.payload.sourceType}
          />
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 shrink-0 text-muted-foreground">{label}</div>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

function IconBtn({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded border bg-white hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function NumberInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center rounded border bg-white text-xs">
      <input
        type="number"
        value={Number(value.toFixed(3))}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent px-2 py-1 outline-none"
      />
      {suffix && (
        <span className="px-1.5 text-[10px] text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}
