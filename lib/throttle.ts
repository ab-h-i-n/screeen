/**
 * Returns a throttled version of `fn` that fires at most once per `ms`.
 * Trailing calls are coalesced and fired after the interval.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  return (...args: Args) => {
    const now = Date.now();
    const wait = ms - (now - last);
    lastArgs = args;
    if (wait <= 0) {
      last = now;
      lastArgs = null;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) {
          const a = lastArgs;
          lastArgs = null;
          fn(...a);
        }
      }, wait);
    }
  };
}
