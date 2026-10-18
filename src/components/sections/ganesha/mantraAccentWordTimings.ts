/** Shared ink easing for all Navkar lines (white + yellow). */
export function smoothInkProgress(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
