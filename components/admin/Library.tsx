"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Type,
  Globe,
  Image as ImageIcon,
  Film,
  Clock,
  CheckSquare,
  Camera,
  Monitor,
  Hourglass,
  QrCode,
  CloudSun,
  Code,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { uid } from "@/lib/utils";
import { useEditor } from "@/stores/editor";

interface Props {
  secret: string;
}

const TEMPLATES: {
  type: Doc<"contents">["type"];
  label: string;
  icon: React.ReactNode;
  build: () => { label: string; payload: unknown };
}[] = [
  {
    type: "text",
    label: "Text",
    icon: <Type size={14} />,
    build: () => ({
      label: "Text",
      payload: {
        text: "Hello",
        color: "#111",
        bgColor: "transparent",
        fontWeight: 700,
        align: "center",
        fontSize: 96,
      },
    }),
  },
  {
    type: "website",
    label: "Website",
    icon: <Globe size={14} />,
    build: () => ({
      label: "Website",
      payload: { url: "https://example.com" },
    }),
  },
  {
    type: "image",
    label: "Image",
    icon: <ImageIcon size={14} />,
    build: () => ({
      label: "Image",
      payload: {
        source: "url",
        url: "https://picsum.photos/1280/720",
        fit: "cover",
      },
    }),
  },
  {
    type: "video",
    label: "Video",
    icon: <Film size={14} />,
    build: () => ({
      label: "Video",
      payload: {
        source: "url",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        autoplay: true,
        muted: true,
        loop: true,
      },
    }),
  },
  {
    type: "clock",
    label: "Clock",
    icon: <Clock size={14} />,
    build: () => ({
      label: "Clock",
      payload: {
        format: "24h",
        showSeconds: false,
        showDate: true,
        dateFormat: "long",
        color: "#111",
      },
    }),
  },
  {
    type: "todo",
    label: "Todo list",
    icon: <CheckSquare size={14} />,
    build: () => ({
      label: "Todo",
      payload: {
        title: "Today",
        items: [
          { id: uid(), text: "First item", done: false },
          { id: uid(), text: "Second item", done: false },
        ],
        showCompleted: true,
        strikethroughDone: true,
        accentColor: "#3b82f6",
      },
    }),
  },
  {
    type: "stream",
    label: "Camera",
    icon: <Camera size={14} />,
    build: () => ({
      label: "Camera",
      payload: {
        sessionId: uid(),
        sourceType: "camera",
        hasAudio: false,
        objectFit: "cover",
      },
    }),
  },
  {
    type: "stream",
    label: "Screen",
    icon: <Monitor size={14} />,
    build: () => ({
      label: "Screen",
      payload: {
        sessionId: uid(),
        sourceType: "screen",
        hasAudio: false,
        objectFit: "contain",
      },
    }),
  },
  {
    type: "countdown",
    label: "Countdown",
    icon: <Hourglass size={14} />,
    build: () => ({
      label: "Countdown",
      payload: {
        targetIso: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        format: "hms",
        color: "#111",
      },
    }),
  },
  {
    type: "qr",
    label: "QR code",
    icon: <QrCode size={14} />,
    build: () => ({
      label: "QR",
      payload: { data: "https://example.com", caption: "Scan me" },
    }),
  },
  {
    type: "weather",
    label: "Weather",
    icon: <CloudSun size={14} />,
    build: () => ({
      label: "Weather",
      payload: { lat: 37.7749, lon: -122.4194, units: "metric", label: "SF" },
    }),
  },
  {
    type: "iframe-html",
    label: "Custom HTML",
    icon: <Code size={14} />,
    build: () => ({
      label: "HTML",
      payload: {
        html: "<html><body style='display:grid;place-items:center;height:100vh;font-family:system-ui;font-size:48px'>Hello</body></html>",
      },
    }),
  },
];

export function Library({ secret }: Props) {
  const contents = useQuery(api.contents.list);
  const createContent = useMutation(api.contents.create);
  const removeContent = useMutation(api.contents.remove);
  const createLayer = useMutation(api.layers.create);
  const createSignaling = useMutation(api.signaling.create);
  const setSelectedLayerId = useEditor((s) => s.setSelectedLayerId);

  const onAdd = async (tpl: (typeof TEMPLATES)[number]) => {
    const built = tpl.build();
    const contentId = await createContent({
      secret,
      type: tpl.type,
      label: built.label,
      payload: built.payload,
    });
    // For stream content, also init the signaling row
    if (tpl.type === "stream") {
      const payload = built.payload as {
        sessionId: string;
        sourceType: "camera" | "screen";
        hasAudio: boolean;
      };
      await createSignaling({
        secret,
        sessionId: payload.sessionId,
        sourceType: payload.sourceType,
        hasAudio: payload.hasAudio,
      });
    }
    const layerId = await createLayer({ secret, contentId });
    // Auto-select the new layer so the inspector (and stream-share QR) is visible
    if (layerId) setSelectedLayerId(layerId);
  };

  const onPlace = async (id: Id<"contents">) => {
    const layerId = await createLayer({ secret, contentId: id });
    if (layerId) setSelectedLayerId(layerId);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add new
        </div>
        <div className="grid grid-cols-2 gap-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onAdd(t)}
              className="flex items-center gap-1.5 rounded border bg-white px-2 py-1.5 text-xs hover:bg-zinc-50"
            >
              {t.icon}
              <span className="truncate">{t.label}</span>
              <Plus size={12} className="ml-auto opacity-50" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Library ({contents?.length ?? 0})
        </div>
        <div className="space-y-1">
          {(contents ?? []).map((c) => (
            <div
              key={c._id}
              className="group flex items-center gap-2 rounded border bg-white px-2 py-1 text-xs"
            >
              <span className="truncate font-medium">{c.label}</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                {c.type}
              </span>
              <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onPlace(c._id)}
                  className="rounded p-1 hover:bg-zinc-100"
                  title="Place on canvas"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${c.label}"? This removes all instances.`)) {
                      removeContent({ secret, id: c._id }).catch(console.error);
                    }
                  }}
                  className="rounded p-1 text-rose-600 hover:bg-rose-50"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {contents?.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No content yet. Click an "Add new" tile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
