export const MOBILE_MOTION_QUERY = "(max-width: 760px)";

export function isMobileMotionViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_MOTION_QUERY).matches
  );
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function prefersMobileWebKitMotion(): boolean {
  return isMobileMotionViewport() || isIOSDevice();
}
