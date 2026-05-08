import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin secret enforcement.
 *
 * Compared against the ADMIN_SECRET env var (set via
 * `npx convex env set ADMIN_SECRET <value>`). Default project value
 * is "123456" — change in production.
 */

export function assertAdmin(secret: string | undefined): void {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    throw new Error(
      "ADMIN_SECRET not set. Run: npx convex env set ADMIN_SECRET <value>",
    );
  }
  if (!secret || secret !== expected) {
    throw new Error("Unauthorized: invalid admin secret");
  }
}

/** Public: check whether a candidate password matches. Used by the admin login form. */
export const verify = query({
  args: { secret: v.string() },
  handler: (_ctx, { secret }) => {
    const expected = process.env.ADMIN_SECRET;
    return Boolean(expected) && secret === expected;
  },
});
