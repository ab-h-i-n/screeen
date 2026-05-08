"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Save, Trash2, Play } from "lucide-react";

interface Props {
  secret: string;
}

export function ScenesPanel({ secret }: Props) {
  const scenes = useQuery(api.scenes.list);
  const save = useMutation(api.scenes.save);
  const apply = useMutation(api.scenes.apply);
  const remove = useMutation(api.scenes.remove);

  const [name, setName] = useState("");

  const onSave = async () => {
    if (!name.trim()) return;
    await save({ secret, name: name.trim(), includeStrokes: true });
    setName("");
  };

  return (
    <div className="border-t p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Scenes
      </div>
      <div className="mb-2 flex items-center gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scene name"
          className="flex-1 rounded border px-2 py-1 text-xs"
          onKeyDown={(e) => e.key === "Enter" && onSave()}
        />
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
        >
          <Save size={12} />
          Save
        </button>
      </div>
      <div className="space-y-1">
        {(scenes ?? []).map((s) => (
          <div
            key={s._id}
            className="group flex items-center gap-2 rounded border bg-white px-2 py-1 text-xs"
          >
            <span className="truncate font-medium">{s.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {s.layers.length} layers
            </span>
            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() =>
                  apply({ secret, id: s._id, replaceStrokes: true })
                }
                className="rounded p-1 hover:bg-zinc-100"
                title="Apply scene"
              >
                <Play size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove({ secret, id: s._id })}
                className="rounded p-1 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {scenes?.length === 0 && (
          <div className="py-2 text-center text-[10px] text-muted-foreground">
            No saved scenes yet
          </div>
        )}
      </div>
    </div>
  );
}
