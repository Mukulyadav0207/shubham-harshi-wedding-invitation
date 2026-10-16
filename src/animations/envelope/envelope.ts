import { gsap } from 'gsap';
import { OPENING_DURATIONS } from '@/animations/masterTimeline';
import { configureGsapPlatform, prefersLinearWebKitMotion } from '@/lib/gsapPlatform';

const FLAP_S = OPENING_DURATIONS.FLAP_MS / 1000;
/** Top flap opens toward the viewer (hinge at top crease). */
export const FLAP_OPEN_ROTATE_X = 158;

export type EnvelopeAnimationRefs = {
  scene: HTMLElement; flap: HTMLElement; innerLight: HTMLElement; openingLight: HTMLElement; topFlapShadow: HTMLElement;
};

type Options = { reducedMotion: boolean; onStart?: () => void; onComplete: () => void };
export type EnvelopeAnimation = { play: () => void; revert: () => void };

/** Opens only the existing top-flap layer after the pre-open light sequence. */
export function createEnvelopeAnimation(refs: EnvelopeAnimationRefs, options: Options): EnvelopeAnimation {
  configureGsapPlatform();
  let timeline: gsap.core.Timeline | undefined;
  const context = gsap.context(() => {
    const mobile = prefersLinearWebKitMotion();
    gsap.set(refs.innerLight, { autoAlpha: 0 });
    gsap.set(refs.openingLight, { autoAlpha: 0, scale: 0.58, transformOrigin: '50% 50%' });
    gsap.set(refs.topFlapShadow, { autoAlpha: 0.16, yPercent: 0 });
    gsap.set(refs.flap, {
      rotateX: 0,
      z: 6,
      transformOrigin: '50% 0.6%',
      transformStyle: 'preserve-3d',
      force3D: true,
    });
    timeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    if (options.onStart) timeline.call(options.onStart);

    if (options.reducedMotion) {
      timeline.set(refs.innerLight, { autoAlpha: 0.7 }).set(refs.openingLight, { autoAlpha: 0.8, scale: 1 }).to(refs.topFlapShadow, { autoAlpha: 0.08, duration: 0.08 }).to(refs.flap, { rotateX: FLAP_OPEN_ROTATE_X, duration: 0.18, force3D: true })
        .set(refs.topFlapShadow, { autoAlpha: 0 }).call(options.onComplete);
      return;
    }

    timeline
      .to(refs.innerLight, { autoAlpha: mobile ? 0.58 : 0.68, duration: 0.45 })
      .to(refs.openingLight, { autoAlpha: mobile ? 0.7 : 0.82, scale: mobile ? 1 : 1.08, duration: 0.26, ease: 'sine.out' }, 0)
      .to(refs.openingLight, { autoAlpha: 0, scale: mobile ? 1.12 : 1.34, duration: mobile ? 0.48 : 0.66, ease: 'sine.inOut' }, 0.3)
      .to(refs.topFlapShadow, { autoAlpha: 0.1, yPercent: 3, duration: 0.28, ease: 'power1.out' }, 0)
      .to(refs.flap, {
        rotateX: FLAP_OPEN_ROTATE_X,
        duration: FLAP_S,
        ease: mobile ? 'none' : 'power2.inOut',
        force3D: true,
      }, 0.04)
      .to(refs.topFlapShadow, { autoAlpha: 0, yPercent: 7, duration: 0.36, ease: 'power1.out' }, 0.62)
      .call(options.onComplete);
  }, refs.scene);
  return { play: () => timeline?.play(0), revert: () => context.revert() };
}
