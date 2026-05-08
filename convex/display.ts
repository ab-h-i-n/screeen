import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("display")
      .withIndex("by_slug", (q) => q.eq("slug", "main"))
      .unique();
    return row;
  },
});

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("display")
      .withIndex("by_slug", (q) => q.eq("slug", "main"))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("display", {
      slug: "main",
      background: "#ffffff",
      updatedAt: Date.now(),
    });
  },
});

export const setBackground = mutation({
  args: { secret: v.string(), background: v.string() },
  handler: async (ctx, { secret, background }) => {
    assertAdmin(secret);
    const row = await ctx.db
      .query("display")
      .withIndex("by_slug", (q) => q.eq("slug", "main"))
      .unique();
    if (!row) throw new Error("display not initialized");
    await ctx.db.patch(row._id, { background, updatedAt: Date.now() });
  },
});

export const heartbeat = mutation({
  args: { agent: v.string() },
  handler: async (ctx, { agent }) => {
    const row = await ctx.db
      .query("display")
      .withIndex("by_slug", (q) => q.eq("slug", "main"))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, {
      lastSeenAt: Date.now(),
      lastSeenAgent: agent,
    });
  },
});
