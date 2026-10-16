import { masterTimeline, MasterPhase } from "@/animations/masterTimeline";

type ScrollListener = (active: boolean) => void;

let initialized = false;
let scrolling = false;
let scrollEndTimer: number | undefined;
const listeners = new Set<ScrollListener>();

function notify(): void {
  for (const listener of listeners) listener(scrolling);
}

function onScroll(): void {
  const phase = masterTimeline.getPhase();
  if (phase < MasterPhase.InvitationEntrance) return;

  if (!scrolling) {
    scrolling = true;
    masterTimeline.setScrollActive(true);
    notify();
  }

  if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
  scrollEndTimer = window.setTimeout(() => {
    scrolling = false;
    masterTimeline.setScrollActive(false);
    notify();
  }, 180);
}

/** One global scroll listener — no per-frame React updates. */
export function initScrollActivity(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function isScrollActive(): boolean {
  return scrolling;
}

export function subscribeScrollActivity(listener: ScrollListener): () => void {
  initScrollActivity();
  listeners.add(listener);
  listener(scrolling);
  return () => listeners.delete(listener);
}
