import type { Doc } from "@/convex/_generated/dataModel";

export interface RendererProps<P = unknown> {
  payload: P;
  /** Per-instance overrides merged on top of payload. */
  overrides?: Partial<P> | null;
  /** True if this is being rendered inside the admin editor (vs the live display). */
  isAdmin?: boolean;
}

export type Layer = Doc<"layers">;
export type Content = Doc<"contents">;
