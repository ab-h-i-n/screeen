import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

const contentType = v.union(
  v.literal("website"),
  v.literal("video"),
  v.literal("image"),
  v.literal("text"),
  v.literal("stream"),
  v.literal("clock"),
  v.literal("todo"),
  v.literal("countdown"),
  v.literal("qr"),
  v.literal("weather"),
  v.literal("iframe-html"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contents").order("desc").take(500);
  },
});

export const get = query({
  args: { id: v.id("contents") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getMany = query({
  args: { ids: v.array(v.id("contents")) },
  handler: async (ctx, { ids }) => {
    return await Promise.all(ids.map((id) => ctx.db.get(id)));
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    type: contentType,
    label: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { secret, ...rest }) => {
    assertAdmin(secret);
    return await ctx.db.insert("contents", rest);
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.id("contents"),
    label: v.optional(v.string()),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, { secret, id, ...patch }) => {
    assertAdmin(secret);
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, cleaned);
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("contents") },
  handler: async (ctx, { secret, id }) => {
    assertAdmin(secret);
    // Delete all layers referencing this content
    const layers = await ctx.db.query("layers").collect();
    for (const l of layers) {
      if (l.contentId === id) await ctx.db.delete(l._id);
    }
    await ctx.db.delete(id);
  },
});
