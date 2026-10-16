import { gsap } from "gsap";
import {
  masterTimeline,
  MasterPhase,
  OPENING_DURATIONS,
} from "@/animations/masterTimeline";

export type MobileOpeningRefs = {
  flap: HTMLElement;
  innerLight: HTMLElement;
  openingLight: HTMLElement;
  topFlapShadow: HTMLElement;
  stage: HTMLElement;
  card: HTMLElement;
  envelopeVeil: HTMLElement;
  light: HTMLElement;
};

type Options = {
  onTransitioning: () => void;
  onGanesha: () => void;
};

export type MobileOpeningSequence = { play: () => void; cancel: () => void };

const { FLAP_MS, LIFT_MS, ZOOM_MS } = OPENING_DURATIONS;
const LIFT_Y_PERCENT = -8;
const POCKET_ORIGIN = "50% 55%";

function clearTimers(...timers: Array<number | undefined>) {
  for (const timer of timers) {
    if (timer) window.clearTimeout(timer);
  }
}

/**
 * Wall-clock opening for iPhone/WebKit: flap → card lift → zoom → Ganesha.
 * Does not rely on GSAP timeline completion (unreliable for 3D on iOS Safari).
 */
export function createMobileOpeningSequence(
  refs: MobileOpeningRefs,
  options: Options,
): MobileOpeningSequence {
  let flapRaf = 0;
  let flyoutRaf = 0;
  let flyoutSafetyTimer: number | undefined;
  let cancelled = false;
  let cardFlyoutStarted = false;
  let zoomPhaseStarted = false;

  const cancel = () => {
    cancelled = true;
    if (flapRaf) window.cancelAnimationFrame(flapRaf);
    if (flyoutRaf) window.cancelAnimationFrame(flyoutRaf);
    clearTimers(flyoutSafetyTimer);
    flapRaf = 0;
    flyoutRaf = 0;
  };

  const applyFlapFrame = (progress: number) => {
    const flapProgress = Math.max(0, Math.min(1, progress));
    gsap.set(refs.innerLight, {
      autoAlpha: 0.58 * Math.min(1, flapProgress * 1.4),
    });
    gsap.set(refs.openingLight, {
      autoAlpha:
        flapProgress < 0.35
          ? 0.7 * (flapProgress / 0.35)
          : Math.max(0, 0.7 * (1 - (flapProgress - 0.35) / 0.65)),
      scale: 0.58 + flapProgress * 0.54,
      transformOrigin: "50% 50%",
    });
    gsap.set(refs.topFlapShadow, {
      autoAlpha: Math.max(0, 0.16 - flapProgress * 0.16),
      yPercent: flapProgress * 7,
    });
  };

  const applyLiftFrame = (progress: number) => {
    const liftProgress = Math.max(0, Math.min(1, progress));
    const yPercent = LIFT_Y_PERCENT * liftProgress;
    const scale = 0.9 + (1.08 - 0.9) * liftProgress;
    gsap.set(refs.card, {
      yPercent,
      scale,
      zIndex: 10,
      autoAlpha: 1,
      transformOrigin: POCKET_ORIGIN,
      force3D: true,
    });
    gsap.set(refs.envelopeVeil, {
      autoAlpha: 0.42 * Math.min(1, liftProgress * 1.15),
    });
    gsap.set(refs.light, { autoAlpha: 0, scale: 0.72 });
  };

  const applyZoomFrame = (progress: number) => {
    const zoomProgress = Math.max(0, Math.min(1, progress));
    const scale = 1.08 + (3.8 - 1.08) * zoomProgress;
    gsap.set(refs.card, {
      yPercent: LIFT_Y_PERCENT,
      scale,
      zIndex: 10,
      autoAlpha: Math.max(0, 1 - zoomProgress * 0.88),
      transformOrigin: POCKET_ORIGIN,
      force3D: true,
    });
    gsap.set(refs.light, {
      autoAlpha: Math.min(1, zoomProgress * 1.05),
      scale: 0.72 + (1.78 - 0.72) * zoomProgress,
      transformOrigin: "50% 50%",
    });
  };

  const finishToGanesha = () => {
    if (cancelled) return;
    cancel();
    gsap.set(refs.light, { autoAlpha: 0, scale: 0.72 });
    gsap.set(refs.envelopeVeil, { autoAlpha: 0 });
    gsap.set(refs.card, { autoAlpha: 0 });
    gsap.set(refs.stage, { autoAlpha: 0 });
    masterTimeline.setPhase(MasterPhase.GaneshaReveal);
    options.onGanesha();
  };

  const runFlyout = (phaseStart: number) => {
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - phaseStart;

      if (elapsed <= LIFT_MS) {
        applyLiftFrame(elapsed / LIFT_MS);
      } else {
        if (!zoomPhaseStarted) {
          zoomPhaseStarted = true;
          masterTimeline.setPhase(MasterPhase.CardToGanesha);
        }
        applyZoomFrame((elapsed - LIFT_MS) / ZOOM_MS);
      }

      if (elapsed < LIFT_MS + ZOOM_MS) {
        flyoutRaf = window.requestAnimationFrame(tick);
        return;
      }
      finishToGanesha();
    };
    flyoutRaf = window.requestAnimationFrame(tick);
  };

  const startCardFlyout = () => {
    if (cancelled || cardFlyoutStarted) return;
    cardFlyoutStarted = true;
    if (flapRaf) window.cancelAnimationFrame(flapRaf);
    flapRaf = 0;

    options.onTransitioning();
    masterTimeline.setPhase(MasterPhase.CardEmergence);
    gsap.set(refs.card, {
      yPercent: 0,
      scale: 0.9,
      zIndex: 3,
      autoAlpha: 1,
      transformOrigin: POCKET_ORIGIN,
      force3D: true,
    });
    gsap.set(refs.envelopeVeil, { autoAlpha: 0 });
    gsap.set(refs.light, { autoAlpha: 0, scale: 0.72 });

    const flyoutStart = performance.now();
    flyoutSafetyTimer = window.setTimeout(finishToGanesha, LIFT_MS + ZOOM_MS + 600);
    runFlyout(flyoutStart);
  };

  const play = () => {
    cancelled = false;
    cardFlyoutStarted = false;
    zoomPhaseStarted = false;
    masterTimeline.setPhase(MasterPhase.EnvelopeOpening);
    gsap.set(refs.stage, { autoAlpha: 1 });
    gsap.set(refs.card, {
      yPercent: 0,
      scale: 1,
      z: -1,
      zIndex: 3,
      autoAlpha: 1,
      transformOrigin: POCKET_ORIGIN,
      force3D: true,
    });
    gsap.set(refs.flap, {
      rotateX: 0,
      z: 6,
      transformOrigin: "50% 0.6%",
      transformStyle: "preserve-3d",
      force3D: true,
    });
    refs.flap.setAttribute("data-flap-anim", "opening");
    refs.flap.style.setProperty("--flap-duration", `${FLAP_MS}ms`);
    gsap.set(refs.innerLight, { autoAlpha: 0 });
    gsap.set(refs.openingLight, { autoAlpha: 0, scale: 0.58 });
    gsap.set(refs.topFlapShadow, { autoAlpha: 0.16, yPercent: 0 });

    const flapStart = performance.now();
    const tickFlap = (now: number) => {
      if (cancelled) return;
      const elapsed = now - flapStart;
      applyFlapFrame(elapsed / FLAP_MS);
      if (elapsed < FLAP_MS) {
        flapRaf = window.requestAnimationFrame(tickFlap);
        return;
      }
      startCardFlyout();
    };

    flyoutRaf = window.requestAnimationFrame(tickFlap);
  };

  return { play, cancel };
}
