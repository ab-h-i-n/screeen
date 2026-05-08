import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  display: defineTable({
    slug: v.string(),
    background: v.string(),
    lastSeenAt: v.optional(v.number()),
    lastSeenAgent: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  contents: defineTable({
    type: v.union(
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
    ),
    label: v.string(),
    payload: v.any(),
  }).index("by_type", ["type"]),

  layers: defineTable({
    contentId: v.id("contents"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    zIndex: v.number(),
    rotation: v.number(),
    opacity: v.number(),
    locked: v.boolean(),
    visible: v.boolean(),
    overrides: v.optional(v.any()),
    updatedAt: v.number(),
  }).index("by_zIndex", ["zIndex"]),

  strokes: defineTable({
    points: v.array(
      v.object({
        x: v.number(),
        y: v.number(),
        pressure: v.number(),
      }),
    ),
    color: v.string(),
    width: v.number(),
    tool: v.union(v.literal("pen"), v.literal("highlighter"), v.literal("eraser")),
    finalized: v.boolean(),
  }),

  scenes: defineTable({
    name: v.string(),
    layers: v.array(v.any()),
    strokes: v.optional(v.array(v.any())),
    thumbnailUrl: v.optional(v.string()),
  }),

  signaling: defineTable({
    sessionId: v.string(),
    sourceType: v.union(v.literal("camera"), v.literal("screen")),
    hasAudio: v.boolean(),
    publisherSdp: v.union(v.string(), v.null()),
    viewerSdp: v.union(v.string(), v.null()),
    publisherCandidates: v.array(v.string()),
    viewerCandidates: v.array(v.string()),
    status: v.union(v.literal("waiting"), v.literal("live"), v.literal("ended")),
    publisherUserAgent: v.optional(v.string()),
    startedAt: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),
});
