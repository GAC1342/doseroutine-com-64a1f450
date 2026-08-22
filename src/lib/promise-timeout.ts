/**
 * Resolve a promise with a hard deadline.
 *
 * Network calls on mobile can hang indefinitely (captive portals, flaky
 * cellular hand-off). Anything that gates a first-run screen must bound its
 * wait so the UI can fall back instead of showing a blank page forever.
 */
export async function withDeadline<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
