import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./auth";

export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertAdmin(secret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const getUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    const out: Record<string, string | null> = {};
    for (const id of storageIds) {
      out[id] = await ctx.storage.getUrl(id);
    }
    return out;
  },
});

export const remove = mutation({
  args: { secret: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { secret, storageId }) => {
    assertAdmin(secret);
    await ctx.storage.delete(storageId);
  },
});
