"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { uid } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  secret: string;
  content: Doc<"contents">;
}

export function ContentEditor({ secret, content }: Props) {
  const update = useMutation(api.contents.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const setPayload = (patch: Record<string, unknown>) => {
    update({
      secret,
      id: content._id,
      payload: { ...content.payload, ...patch },
    }).catch(console.error);
  };

  const setLabel = (label: string) =>
    update({ secret, id: content._id, label }).catch(console.error);

  return (
    <div className="space-y-2">
      <Field label="Label">
        <input
          type="text"
          value={content.label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>

      {content.type === "text" && <TextEditor payload={content.payload} setPayload={setPayload} />}
      {content.type === "website" && (
        <WebsiteEditor payload={content.payload} setPayload={setPayload} />
      )}
      {content.type === "image" && (
        <ImageEditor
          payload={content.payload}
          setPayload={setPayload}
          secret={secret}
          generateUploadUrl={generateUploadUrl}
        />
      )}
      {content.type === "video" && (
        <VideoEditor
          payload={content.payload}
          setPayload={setPayload}
          secret={secret}
          generateUploadUrl={generateUploadUrl}
        />
      )}
      {content.type === "clock" && <ClockEditor payload={content.payload} setPayload={setPayload} />}
      {content.type === "todo" && <TodoEditor payload={content.payload} setPayload={setPayload} />}
      {content.type === "countdown" && (
        <CountdownEditor payload={content.payload} setPayload={setPayload} />
      )}
      {content.type === "qr" && <QrEditor payload={content.payload} setPayload={setPayload} />}
      {content.type === "weather" && (
        <WeatherEditor payload={content.payload} setPayload={setPayload} />
      )}
      {content.type === "iframe-html" && (
        <IframeHtmlEditor payload={content.payload} setPayload={setPayload} />
      )}
      {content.type === "stream" && (
        <StreamEditor payload={content.payload} setPayload={setPayload} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function TextEditor({ payload, setPayload }: any) {
  return (
    <>
      <Field label="Text">
        <textarea
          value={payload.text ?? ""}
          onChange={(e) => setPayload({ text: e.target.value })}
          rows={3}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size (px)">
          <input
            type="number"
            min={8}
            max={1024}
            value={payload.fontSize ?? 64}
            onChange={(e) => setPayload({ fontSize: Number(e.target.value) })}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </Field>
        <Field label="Weight">
          <select
            value={payload.fontWeight ?? 600}
            onChange={(e) => setPayload({ fontWeight: Number(e.target.value) })}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value={300}>Light</option>
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
            <option value={800}>Extra-bold</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Color">
          <input
            type="color"
            value={payload.color ?? "#111111"}
            onChange={(e) => setPayload({ color: e.target.value })}
            className="h-7 w-full rounded border"
          />
        </Field>
        <Field label="Background">
          <input
            type="color"
            value={payload.bgColor ?? "#ffffff"}
            onChange={(e) => setPayload({ bgColor: e.target.value })}
            className="h-7 w-full rounded border"
          />
        </Field>
      </div>
      <Field label="Align">
        <select
          value={payload.align ?? "center"}
          onChange={(e) => setPayload({ align: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </>
  );
}

function WebsiteEditor({ payload, setPayload }: any) {
  return (
    <Field label="URL">
      <input
        type="url"
        value={payload.url ?? ""}
        onChange={(e) => setPayload({ url: e.target.value })}
        className="w-full rounded border px-2 py-1 text-xs"
        placeholder="https://example.com"
      />
    </Field>
  );
}

function ImageEditor({
  payload,
  setPayload,
  secret,
  generateUploadUrl,
}: any) {
  const onUpload = async (file: File) => {
    const url = await generateUploadUrl({ secret });
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const { storageId } = await res.json();
    setPayload({ source: "upload", storageId });
  };
  return (
    <>
      <Field label="Source">
        <select
          value={payload.source ?? "url"}
          onChange={(e) => setPayload({ source: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="url">URL</option>
          <option value="upload">Upload</option>
        </select>
      </Field>
      {payload.source === "url" ? (
        <Field label="URL">
          <input
            type="url"
            value={payload.url ?? ""}
            onChange={(e) => setPayload({ url: e.target.value })}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </Field>
      ) : (
        <Field label="File">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
            className="w-full text-xs"
          />
          {payload.storageId && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              storageId: {payload.storageId.slice(0, 8)}…
            </div>
          )}
        </Field>
      )}
      <Field label="Fit">
        <select
          value={payload.fit ?? "cover"}
          onChange={(e) => setPayload({ fit: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </Field>
    </>
  );
}

function VideoEditor({
  payload,
  setPayload,
  secret,
  generateUploadUrl,
}: any) {
  const onUpload = async (file: File) => {
    const url = await generateUploadUrl({ secret });
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const { storageId } = await res.json();
    setPayload({ source: "upload", storageId });
  };
  return (
    <>
      <Field label="Source">
        <select
          value={payload.source ?? "url"}
          onChange={(e) => setPayload({ source: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="url">URL (YouTube/Vimeo/MP4)</option>
          <option value="upload">Upload</option>
        </select>
      </Field>
      {payload.source === "url" ? (
        <Field label="URL">
          <input
            type="url"
            value={payload.url ?? ""}
            onChange={(e) => setPayload({ url: e.target.value })}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </Field>
      ) : (
        <Field label="File (mp4/webm)">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
            className="w-full text-xs"
          />
        </Field>
      )}
      <div className="grid grid-cols-3 gap-1 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={payload.autoplay !== false}
            onChange={(e) => setPayload({ autoplay: e.target.checked })}
          />
          Autoplay
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={payload.muted !== false}
            onChange={(e) => setPayload({ muted: e.target.checked })}
          />
          Muted
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={payload.loop !== false}
            onChange={(e) => setPayload({ loop: e.target.checked })}
          />
          Loop
        </label>
      </div>
    </>
  );
}

function ClockEditor({ payload, setPayload }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Format">
          <select
            value={payload.format ?? "24h"}
            onChange={(e) => setPayload({ format: e.target.value })}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="24h">24h</option>
            <option value="12h">12h</option>
          </select>
        </Field>
        <Field label="Date format">
          <select
            value={payload.dateFormat ?? "long"}
            onChange={(e) => setPayload({ dateFormat: e.target.value })}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="short">Short</option>
            <option value="long">Long</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!payload.showSeconds}
            onChange={(e) => setPayload({ showSeconds: e.target.checked })}
          />
          Seconds
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={payload.showDate !== false}
            onChange={(e) => setPayload({ showDate: e.target.checked })}
          />
          Show date
        </label>
      </div>
      <Field label="Timezone">
        <input
          type="text"
          value={payload.timezone ?? ""}
          onChange={(e) => setPayload({ timezone: e.target.value })}
          placeholder="(local) — e.g. America/New_York"
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Color">
          <input
            type="color"
            value={payload.color ?? "#111111"}
            onChange={(e) => setPayload({ color: e.target.value })}
            className="h-7 w-full rounded border"
          />
        </Field>
        <Field label="Background">
          <input
            type="color"
            value={payload.bgColor ?? "#ffffff"}
            onChange={(e) => setPayload({ bgColor: e.target.value })}
            className="h-7 w-full rounded border"
          />
        </Field>
      </div>
    </>
  );
}

function TodoEditor({ payload, setPayload }: any) {
  const items: { id: string; text: string; done: boolean }[] = payload.items ?? [];
  return (
    <>
      <Field label="Title">
        <input
          type="text"
          value={payload.title ?? ""}
          onChange={(e) => setPayload({ title: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={it.done}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...it, done: e.target.checked };
                setPayload({ items: next });
              }}
            />
            <input
              type="text"
              value={it.text}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...it, text: e.target.value };
                setPayload({ items: next });
              }}
              className="flex-1 rounded border px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => setPayload({ items: items.filter((_, j) => j !== i) })}
              className="rounded p-1 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setPayload({
              items: [...items, { id: uid(), text: "", done: false }],
            })
          }
          className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-zinc-50"
        >
          <Plus size={12} /> Add item
        </button>
      </div>
    </>
  );
}

function CountdownEditor({ payload, setPayload }: any) {
  const local = payload.targetIso
    ? new Date(payload.targetIso).toISOString().slice(0, 16)
    : "";
  return (
    <>
      <Field label="Target (local)">
        <input
          type="datetime-local"
          value={local}
          onChange={(e) =>
            setPayload({ targetIso: new Date(e.target.value).toISOString() })
          }
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Format">
        <select
          value={payload.format ?? "hms"}
          onChange={(e) => setPayload({ format: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="dhms">Days + h:m:s</option>
          <option value="hms">h:m:s</option>
          <option value="ms">m:s</option>
        </select>
      </Field>
      <Field label="Expired text">
        <input
          type="text"
          value={payload.expiredText ?? ""}
          onChange={(e) => setPayload({ expiredText: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
          placeholder="00:00"
        />
      </Field>
    </>
  );
}

function QrEditor({ payload, setPayload }: any) {
  return (
    <>
      <Field label="Data / URL">
        <input
          type="text"
          value={payload.data ?? ""}
          onChange={(e) => setPayload({ data: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
      <Field label="Caption">
        <input
          type="text"
          value={payload.caption ?? ""}
          onChange={(e) => setPayload({ caption: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
    </>
  );
}

function WeatherEditor({ payload, setPayload }: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Latitude">
          <input
            type="number"
            step="0.0001"
            value={payload.lat ?? 0}
            onChange={(e) => setPayload({ lat: Number(e.target.value) })}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="0.0001"
            value={payload.lon ?? 0}
            onChange={(e) => setPayload({ lon: Number(e.target.value) })}
            className="w-full rounded border px-2 py-1 text-xs"
          />
        </Field>
      </div>
      <Field label="Units">
        <select
          value={payload.units ?? "metric"}
          onChange={(e) => setPayload({ units: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="metric">°C / km/h</option>
          <option value="imperial">°F / mph</option>
        </select>
      </Field>
      <Field label="Label">
        <input
          type="text"
          value={payload.label ?? ""}
          onChange={(e) => setPayload({ label: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </Field>
    </>
  );
}

function IframeHtmlEditor({ payload, setPayload }: any) {
  return (
    <Field label="HTML">
      <textarea
        value={payload.html ?? ""}
        onChange={(e) => setPayload({ html: e.target.value })}
        rows={8}
        className="w-full rounded border px-2 py-1 font-mono text-[10px]"
      />
    </Field>
  );
}

function StreamEditor({ payload, setPayload }: any) {
  return (
    <>
      <Field label="Source">
        <div className="rounded border bg-muted px-2 py-1 text-xs">
          {payload.sourceType === "screen" ? "🖥️ Screen" : "📷 Camera"}
        </div>
      </Field>
      <Field label="Object fit">
        <select
          value={payload.objectFit ?? (payload.sourceType === "screen" ? "contain" : "cover")}
          onChange={(e) => setPayload({ objectFit: e.target.value })}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
      </Field>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!payload.unmuted}
            onChange={(e) => setPayload({ unmuted: e.target.checked })}
          />
          Unmute
        </label>
        {payload.sourceType === "camera" && (
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!!payload.mirror}
              onChange={(e) => setPayload({ mirror: e.target.checked })}
            />
            Mirror
          </label>
        )}
      </div>
    </>
  );
}
