export const BALL_BOUNCE_DURATION_MS = 6200;
export const BALL_BOUNCE_SAMPLE_COUNT = 120;

export type BallBounceConfig = {
  peak?: number;
  bounceCount?: number;
  damping?: number;
};

const DEFAULT_CONFIG: BallBounceConfig = {
  peak: 72,
  bounceCount: 6.1,
  damping: 4.6,
};

export function sampleBallBounce(
  progress: number,
  config: BallBounceConfig = DEFAULT_CONFIG,
): { y: number; scaleX: number; scaleY: number } {
  const peak = config.peak ?? DEFAULT_CONFIG.peak!;
  const bounceCount = config.bounceCount ?? DEFAULT_CONFIG.bounceCount!;
  const damping = config.damping ?? DEFAULT_CONFIG.damping!;
  const t = Math.max(0, Math.min(1, progress));

  if (t === 0 || t >= 1) {
    return { y: 0, scaleX: 1, scaleY: 1 };
  }

  const envelope = Math.exp(-damping * t);
  const wave = Math.abs(Math.sin(bounceCount * Math.PI * t));
  const y = -peak * envelope * wave;

  const dt = 0.005;
  const tNext = Math.min(1, t + dt);
  const yNext =
    -peak *
    Math.exp(-damping * tNext) *
    Math.abs(Math.sin(bounceCount * Math.PI * tNext));
  const velocity = (yNext - y) / dt;

  const nearFloor = y > -peak * 0.05;
  const impact =
    nearFloor && velocity > 0 ? Math.min(1, velocity / 2200) : 0;
  const stretch =
    velocity < 0 ? Math.min(0.08, (Math.abs(y) / peak) * 0.1) : 0;

  const scaleY = 1 + impact * 0.1 + stretch * 0.45;
  const scaleX = 1 - impact * 0.065 - stretch * 0.3;

  return { y, scaleX, scaleY };
}

export function ballBounceTransformAt(
  progress: number,
  config: BallBounceConfig = DEFAULT_CONFIG,
): string {
  const { y, scaleX, scaleY } = sampleBallBounce(progress, config);
  return `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
}

function buildAnimationKeyframes(config: BallBounceConfig = DEFAULT_CONFIG) {
  const keyframes = [];
  for (let index = 0; index <= BALL_BOUNCE_SAMPLE_COUNT; index += 1) {
    const progress = index / BALL_BOUNCE_SAMPLE_COUNT;
    const { y, scaleX, scaleY } = sampleBallBounce(progress, config);
    keyframes.push({
      transform: `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
      offset: progress,
    });
  }
  return keyframes;
}

export function getElementViewportScrollProgress(
  element: HTMLElement,
  enterRatio = 0.98,
  settleRatio = 0.3,
): number {
  const rect = element.getBoundingClientRect();
  const centerY = rect.top + rect.height / 2;
  const viewportHeight = window.innerHeight;
  const enterY = viewportHeight * enterRatio;
  const settleY = viewportHeight * settleRatio;

  if (centerY >= enterY) return 0;
  if (centerY <= settleY) return 1;
  return (enterY - centerY) / (enterY - settleY);
}

export function getPageScrollBounceProgress(scrollDistance: number): number {
  const scrollTop =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;
  if (scrollDistance <= 0) return 1;
  return Math.max(0, Math.min(1, scrollTop / scrollDistance));
}

export function playBallBounceAnimation(
  element: HTMLElement,
  config: BallBounceConfig = DEFAULT_CONFIG,
  durationMs = BALL_BOUNCE_DURATION_MS,
): Animation {
  element.getAnimations().forEach((animation) => animation.cancel());
  element.style.transform = "";

  const animation = element.animate(buildAnimationKeyframes(config), {
    duration: durationMs,
    easing: "linear",
    fill: "forwards",
  });

  animation.onfinish = () => {
    element.style.transform = ballBounceTransformAt(1, config);
  };

  return animation;
}
