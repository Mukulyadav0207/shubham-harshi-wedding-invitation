import { gsap } from "gsap";
import { isIOSDevice, isMobileMotionViewport } from "@/lib/motion";

let configured = false;

/** Tune GSAP for iPhone/WebKit so stalled frames do not skip whole timelines. */
export function configureGsapPlatform() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  if (!isMobileMotionViewport() && !isIOSDevice()) return;

  // Default lag smoothing catches up after ~500ms gaps — on iOS that can
  // fast-forward a 1s flap / 12s mantra into a single frame.
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.fps(-1);
}

/** Mobile viewport or iOS — use wall-clock / linear motion instead of GSAP 3D chains. */
export function prefersLinearWebKitMotion(): boolean {
  return isMobileMotionViewport() || isIOSDevice();
}
