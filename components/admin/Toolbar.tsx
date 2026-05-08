"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  MousePointer2,
  PenLine,
  Highlighter,
  Eraser,
  Undo2,
  Trash2,
  Maximize2,
} from "lucide-react";
import { useEditor } from "@/stores/editor";
import { cn } from "@/lib/utils";

const SWATCHES = ["#111111", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

interface Props {
  secret: string;
}

export function Toolbar({ secret }: Props) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const penColor = useEditor((s) => s.penColor);
  const setPenColor = useEditor((s) => s.setPenColor);
  const penWidth = useEditor((s) => s.penWidth);
  const setPenWidth = useEditor((s) => s.setPenWidth);
  const showSafeArea = useEditor((s) => s.showSafeArea);
  const toggleSafeArea = useEditor((s) => s.toggleSafeArea);

  const undo = useMutation(api.strokes.undo);
  const clear = useMutation(api.strokes.clear);

  return (
    <div className="flex items-center gap-2 border-b bg-white px-3 py-2 text-sm">
      <ToolBtn active={tool === "select"} onClick={() => setTool("select")} title="Select (V)">
        <MousePointer2 size={16} />
      </ToolBtn>
      <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Pen (P)">
        <PenLine size={16} />
      </ToolBtn>
      <ToolBtn
        active={tool === "highlighter"}
        onClick={() => setTool("highlighter")}
        title="Highlighter (H)"
      >
        <Highlighter size={16} />
      </ToolBtn>
      <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Eraser (E)">
        <Eraser size={16} />
      </ToolBtn>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setPenColor(c)}
            className={cn(
              "h-5 w-5 rounded-full border",
              penColor === c ? "ring-2 ring-blue-500 ring-offset-1" : "",
            )}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
        <input
          type="color"
          value={penColor}
          onChange={(e) => setPenColor(e.target.value)}
          className="ml-1 h-5 w-7 cursor-pointer rounded border"
        />
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Width
        <input
          type="range"
          min={1}
          max={30}
          value={penWidth}
          onChange={(e) => setPenWidth(Number(e.target.value))}
          className="w-24"
        />
        <span className="w-6 text-right tabular-nums">{penWidth}</span>
      </label>

      <div className="mx-2 h-6 w-px bg-border" />

      <button
        type="button"
        onClick={() => undo({ secret }).catch(console.error)}
        className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-zinc-50"
        title="Undo (⌘Z)"
      >
        <Undo2 size={14} />
        Undo
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("Clear all strokes?")) clear({ secret }).catch(console.error);
        }}
        className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-zinc-50"
      >
        <Trash2 size={14} />
        Clear board
      </button>

      <div className="ml-auto flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={showSafeArea}
            onChange={toggleSafeArea}
            className="h-3 w-3"
          />
          <Maximize2 size={12} />
          Safe area
        </label>
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded border",
        active
          ? "border-blue-500 bg-blue-50 text-blue-600"
          : "bg-white hover:bg-zinc-50",
      )}
    >
      {children}
    </button>
  );
}
