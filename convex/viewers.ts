import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Multi-viewer signaling helpers.
 *
 * Each viewer (admin canvas, display, etc.) creates its own row keyed
 * by (sessionId, viewerId). The publisher creates a separate
 * RTCPeerConnection per viewer and writes a per-viewer offer. The
 * viewer answers in its own row. ICE candidates are exchanged within
 * the row.
 */

export const announce = mutation({
  args: { sessionId: v.string(), viewerId: v.string() },
  handler: async (ctx, { sessionId, viewerId }) => {
    const existing = await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("viewers", {
      sessionId,
      viewerId,
      publisherSdp: null,
      viewerSdp: null,
      publisherCandidates: [],
      viewerCandidates: [],
      lastSeenAt: Date.now(),
    });
  },
});

export const listForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

export const getOne = query({
  args: { sessionId: v.string(), viewerId: v.string() },
  handler: async (ctx, { sessionId, viewerId }) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
      .unique();
  },
});

export const setPublisherOffer = mutation({
  args: {
    sessionId: v.string(),
    viewerId: v.string(),
    sdp: v.string(),
  },
  handler: async (ctx, { sessionId, viewerId, sdp }) => {
    const row = await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
      .unique();
    if (!row) throw new Error("viewer not found");
    await ctx.db.patch(row._id, { publisherSdp: sdp });
  },
});

export const setViewerAnswer = mutation({
  args: {
    sessionId: v.string(),
    viewerId: v.string(),
    sdp: v.string(),
  },
  handler: async (ctx, { sessionId, viewerId, sdp }) => {
    const row = await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { viewerSdp: sdp });
  },
});

export const addCandidate = mutation({
  args: {
    sessionId: v.string(),
    viewerId: v.string(),
    role: v.union(v.literal("publisher"), v.literal("viewer")),
    candidate: v.string(),
  },
  handler: async (ctx, { sessionId, viewerId, role, candidate }) => {
    const row = await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
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

export const remove = mutation({
  args: { sessionId: v.string(), viewerId: v.string() },
  handler: async (ctx, { sessionId, viewerId }) => {
    const row = await ctx.db
      .query("viewers")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", sessionId).eq("viewerId", viewerId),
      )
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

/** Wipe all viewer rows for a session (used by signaling.reset). */
export const removeAllForSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const rows = await ctx.db
      .query("viewers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
  },
});
