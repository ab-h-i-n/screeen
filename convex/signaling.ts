import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

const sourceType = v.union(v.literal("camera"), v.literal("screen"));

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    sessionId: v.string(),
    sourceType,
    hasAudio: v.boolean(),
  },
  handler: async (ctx, { secret, sessionId, sourceType, hasAudio }) => {
    assertAdmin(secret);
    const existing = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("signaling", {
      sessionId,
      sourceType,
      hasAudio,
      status: "waiting",
    });
  },
});

/** Publisher tells the world it's now broadcasting on this session. */
export const markLive = mutation({
  args: { sessionId: v.string(), userAgent: v.string() },
  handler: async (ctx, { sessionId, userAgent }) => {
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) throw new Error("session not found");
    await ctx.db.patch(row._id, {
      status: "live",
      publisherUserAgent: userAgent,
      startedAt: Date.now(),
    });
  },
});

export const end = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { status: "ended" });
    // Clear viewer rows so reconnects start fresh
    const viewers = await ctx.db
      .query("viewers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const r of viewers) await ctx.db.delete(r._id);
  },
});

export const reset = mutation({
  args: { secret: v.string(), sessionId: v.string() },
  handler: async (ctx, { secret, sessionId }) => {
    assertAdmin(secret);
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, {
      status: "waiting",
      startedAt: undefined,
      publisherUserAgent: undefined,
    });
    const viewers = await ctx.db
      .query("viewers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const r of viewers) await ctx.db.delete(r._id);
  },
});
