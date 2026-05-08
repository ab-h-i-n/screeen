import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

const point = v.object({
  x: v.number(),
  y: v.number(),
  pressure: v.number(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("strokes").order("asc").collect();
  },
});

export const begin = mutation({
  args: {
    secret: v.string(),
    color: v.string(),
    width: v.number(),
    tool: v.union(
      v.literal("pen"),
      v.literal("highlighter"),
      v.literal("eraser"),
    ),
    points: v.array(point),
  },
  handler: async (ctx, { secret, ...rest }) => {
    assertAdmin(secret);
    return await ctx.db.insert("strokes", { ...rest, finalized: false });
  },
});

export const append = mutation({
  args: {
    secret: v.string(),
    id: v.id("strokes"),
    points: v.array(point),
    finalize: v.optional(v.boolean()),
  },
  handler: async (ctx, { secret, id, points, finalize }) => {
    assertAdmin(secret);
    const existing = await ctx.db.get(id);
    if (!existing) return;
    await ctx.db.patch(id, {
      points: [...existing.points, ...points],
      finalized: finalize ?? existing.finalized,
    });
  },
});

export const undo = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertAdmin(secret);
    const all = await ctx.db.query("strokes").order("desc").take(1);
    if (all[0]) await ctx.db.delete(all[0]._id);
  },
});

export const removeOne = mutation({
  args: { secret: v.string(), id: v.id("strokes") },
  handler: async (ctx, { secret, id }) => {
    assertAdmin(secret);
    await ctx.db.delete(id);
  },
});

export const clear = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertAdmin(secret);
    const all = await ctx.db.query("strokes").collect();
    for (const s of all) await ctx.db.delete(s._id);
  },
});
