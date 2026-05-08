/**
 * Admin secret enforcement.
 *
 * The admin client reads a 32-char secret from the URL hash (#k=...) and
 * passes it with every mutation. We compare against the env var ADMIN_SECRET
 * which is set via `npx convex env set ADMIN_SECRET <value>`.
 *
 * Hash-based URL means the secret is never sent in HTTP request lines, so
 * it stays out of server access logs.
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
