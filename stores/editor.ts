"use client";

import { create } from "zustand";
import type { Id } from "@/convex/_generated/dataModel";

export type Tool = "select" | "pen" | "highlighter" | "eraser";

export interface EditorState {
  tool: Tool;
  setTool: (t: Tool) => void;
  selectedLayerId: Id<"layers"> | null;
  setSelectedLayerId: (id: Id<"layers"> | null) => void;
  // Drawing
  penColor: string;
  penWidth: number;
  setPenColor: (c: string) => void;
  setPenWidth: (w: number) => void;
  // Settings
  showSafeArea: boolean;
  toggleSafeArea: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  tool: "select",
  setTool: (t) => set({ tool: t }),
  selectedLayerId: null,
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  penColor: "#111111",
  penWidth: 4,
  setPenColor: (c) => set({ penColor: c }),
  setPenWidth: (w) => set({ penWidth: w }),
  showSafeArea: false,
  toggleSafeArea: () => set((s) => ({ showSafeArea: !s.showSafeArea })),
}));
