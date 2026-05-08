/* eslint-disable */
/**
 * Stub. Overwritten by `npx convex dev`.
 *
 * Convex's reactive client looks up functions by string name via this proxy,
 * so a Proxy that returns nested string-named handles is enough at runtime.
 * Once `convex dev` runs, this is replaced with a real codegen file.
 */

import { anyApi } from "convex/server";

export const api = anyApi;
export const internal = anyApi;
