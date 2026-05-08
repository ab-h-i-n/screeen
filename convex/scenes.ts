import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scenes").order("desc").collect();
  },
});

export const save = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    includeStrokes: v.boolean(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, { secret, name, includeStrokes, thumbnailUrl }) => {
    assertAdmin(secret);
    const layers = (await ctx.db.query("layers").collect()).map(
      ({ _id, _creationTime, ...rest }) => rest,
    );
    const strokes = includeStrokes
      ? (await ctx.db.query("strokes").collect()).map(
          ({ _id, _creationTime, ...rest }) => rest,
        )
      : undefined;
    return await ctx.db.insert("scenes", {
      name,
      layers,
      strokes,
      thumbnailUrl,
    });
  },
});

export const apply = mutation({
  args: {
    secret: v.string(),
    id: v.id("scenes"),
    replaceStrokes: v.boolean(),
  },
  handler: async (ctx, { secret, id, replaceStrokes }) => {
    assertAdmin(secret);
    const scene = await ctx.db.get(id);
    if (!scene) return;
    const existingLayers = await ctx.db.query("layers").collect();
    for (const l of existingLayers) await ctx.db.delete(l._id);
    for (const l of scene.layers) {
      await ctx.db.insert("layers", { ...l, updatedAt: Date.now() });
    }
    if (replaceStrokes && scene.strokes) {
      const existing = await ctx.db.query("strokes").collect();
      for (const s of existing) await ctx.db.delete(s._id);
      for (const s of scene.strokes) {
        await ctx.db.insert("strokes", s);
      }
    }
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("scenes") },
  handler: async (ctx, { secret, id }) => {
    assertAdmin(secret);
    await ctx.db.delete(id);
  },
});
