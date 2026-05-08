import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const layers = await ctx.db.query("layers").collect();
    return layers.sort((a, b) => a.zIndex - b.zIndex);
  },
});

const DEFAULTS = {
  x: 0.35,
  y: 0.35,
  width: 0.3,
  height: 0.3,
  zIndex: 1,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
};

export const create = mutation({
  args: {
    secret: v.string(),
    contentId: v.id("contents"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, { secret, contentId, ...overrides }) => {
    assertAdmin(secret);
    const all = await ctx.db.query("layers").collect();
    const maxZ = all.reduce((m, l) => Math.max(m, l.zIndex), 0);
    return await ctx.db.insert("layers", {
      contentId,
      ...DEFAULTS,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => v !== undefined),
      ),
      zIndex: maxZ + 1,
      updatedAt: Date.now(),
    });
  },
});

export const patch = mutation({
  args: {
    secret: v.string(),
    id: v.id("layers"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rotation: v.optional(v.number()),
    opacity: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    overrides: v.optional(v.any()),
  },
  handler: async (ctx, { secret, id, ...rest }) => {
    assertAdmin(secret);
    const cleaned = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, { ...cleaned, updatedAt: Date.now() });
  },
});

export const setZ = mutation({
  args: {
    secret: v.string(),
    id: v.id("layers"),
    op: v.union(
      v.literal("front"),
      v.literal("back"),
      v.literal("forward"),
      v.literal("backward"),
    ),
  },
  handler: async (ctx, { secret, id, op }) => {
    assertAdmin(secret);
    const all = (await ctx.db.query("layers").collect()).sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    const target = all.find((l) => l._id === id);
    if (!target) return;
    if (op === "front") {
      const max = all.reduce((m, l) => Math.max(m, l.zIndex), 0);
      await ctx.db.patch(id, { zIndex: max + 1, updatedAt: Date.now() });
    } else if (op === "back") {
      const min = all.reduce((m, l) => Math.min(m, l.zIndex), 0);
      await ctx.db.patch(id, { zIndex: min - 1, updatedAt: Date.now() });
    } else if (op === "forward" || op === "backward") {
      const idx = all.findIndex((l) => l._id === id);
      const swapIdx = op === "forward" ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= all.length) return;
      const other = all[swapIdx];
      await ctx.db.patch(id, { zIndex: other.zIndex, updatedAt: Date.now() });
      await ctx.db.patch(other._id, {
        zIndex: target.zIndex,
        updatedAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("layers") },
  handler: async (ctx, { secret, id }) => {
    assertAdmin(secret);
    await ctx.db.delete(id);
  },
});

export const clear = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertAdmin(secret);
    const all = await ctx.db.query("layers").collect();
    for (const l of all) await ctx.db.delete(l._id);
  },
});
