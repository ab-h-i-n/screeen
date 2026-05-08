"use client";

import type { RendererProps } from "./types";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoPayload {
  title?: string;
  items: TodoItem[];
  showCompleted?: boolean;
  strikethroughDone?: boolean;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  accentColor?: string;
}

export function TodoRenderer({ payload, overrides }: RendererProps<TodoPayload>) {
  const p = { ...payload, ...(overrides ?? {}) };
  const visible = (p.items ?? []).filter(
    (it) => p.showCompleted !== false || !it.done,
  );

  return (
    <div
      className="flex h-full w-full flex-col gap-2 overflow-hidden p-4"
      style={{
        backgroundColor: p.bgColor ?? "rgba(255,255,255,0.92)",
        color: p.color ?? "#111",
        fontFamily: p.fontFamily ?? "inherit",
        containerType: "size",
      }}
    >
      {p.title && (
        <div
          className="font-semibold"
          style={{ fontSize: "min(7cqw, 12cqh)", marginBottom: "0.3em" }}
        >
          {p.title}
        </div>
      )}
      <ul className="space-y-1.5 overflow-hidden">
        {visible.map((it) => (
          <li
            key={it.id}
            className="flex items-start gap-2"
            style={{ fontSize: "min(5cqw, 8cqh)", lineHeight: 1.3 }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: "0.9em",
                height: "0.9em",
                marginTop: "0.18em",
                borderRadius: "0.2em",
                border: `2px solid ${p.accentColor ?? "#3b82f6"}`,
                backgroundColor: it.done ? p.accentColor ?? "#3b82f6" : "transparent",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                textDecoration:
                  it.done && p.strikethroughDone !== false
                    ? "line-through"
                    : undefined,
                opacity: it.done ? 0.5 : 1,
              }}
            >
              {it.text}
            </span>
          </li>
        ))}
        {visible.length === 0 && (
          <li
            className="text-muted-foreground"
            style={{ fontSize: "min(4cqw, 6cqh)" }}
          >
            (no items)
          </li>
        )}
      </ul>
    </div>
  );
}
