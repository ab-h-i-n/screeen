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

export const getMany = query({
  args: { sessionIds: v.array(v.string()) },
  handler: async (ctx, { sessionIds }) => {
    const out: any[] = [];
    for (const sid of sessionIds) {
      const row = await ctx.db
        .query("signaling")
        .withIndex("by_session", (q) => q.eq("sessionId", sid))
        .unique();
      if (row) out.push(row);
    }
    return out;
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
      publisherSdp: null,
      viewerSdp: null,
      publisherCandidates: [],
      viewerCandidates: [],
      status: "waiting",
    });
  },
});

export const setPublisherSdp = mutation({
  args: { sessionId: v.string(), sdp: v.string(), userAgent: v.string() },
  handler: async (ctx, { sessionId, sdp, userAgent }) => {
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) throw new Error("session not found");
    await ctx.db.patch(row._id, {
      publisherSdp: sdp,
      publisherUserAgent: userAgent,
      status: "live",
      startedAt: Date.now(),
    });
  },
});

export const setViewerSdp = mutation({
  args: { sessionId: v.string(), sdp: v.string() },
  handler: async (ctx, { sessionId, sdp }) => {
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { viewerSdp: sdp });
  },
});

export const addCandidate = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("publisher"), v.literal("viewer")),
    candidate: v.string(),
  },
  handler: async (ctx, { sessionId, role, candidate }) => {
    const row = await ctx.db
      .query("signaling")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) return;
    if (role === "publisher") {
      await ctx.db.patch(row._id, {
        publisherCandidates: [...row.publisherCandidates, candidate],
      });
    } else {
      await ctx.db.patch(row._id, {
        viewerCandidates: [...row.viewerCandidates, candidate],
      });
    }
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
      publisherSdp: null,
      viewerSdp: null,
      publisherCandidates: [],
      viewerCandidates: [],
      status: "waiting",
      startedAt: undefined,
    });
  },
});
