/** Canvas aspect ratio (width / height). 16:9 mirrors most monitors. */
export const CANVAS_ASPECT = 16 / 9;

/** Clamp `n` to [min, max]. */
export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));

/** Snap a value to nearest of an array within tolerance, else return value. */
export function snapTo(value: number, candidates: number[], tol: number) {
  for (const c of candidates) {
    if (Math.abs(value - c) <= tol) return c;
  }
  return value;
}
