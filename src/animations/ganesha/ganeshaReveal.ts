import { gsap } from 'gsap';
import { configureGsapPlatform, prefersLinearWebKitMotion } from '@/lib/gsapPlatform';

type GaneshaRevealRefs = { root: HTMLElement; page: HTMLElement; ganesha: HTMLElement; halo: HTMLElement; goldenLight: HTMLElement };
type Options = { reducedMotion: boolean; onComplete?: () => void };
export type GaneshaRevealAnimation = { play: () => void; revert: () => void };

const haloCentered = { xPercent: -50 as const, yPercent: -50 as const };
const ganeshaCentered = {};

/** Expands the invitation page out of the final gold bloom, then reveals Ganesha. */
export function createGaneshaRevealAnimation(refs: GaneshaRevealRefs, options: Options): GaneshaRevealAnimation {
  configureGsapPlatform();
  let timeline: gsap.core.Timeline | undefined;
  const lightweightReveal = prefersLinearWebKitMotion();
  const motionEase = lightweightReveal ? 'none' : 'power3.inOut';
  const haloEase = lightweightReveal ? 'none' : 'power2.out';
  const pageRevealFrom = lightweightReveal
    ? { autoAlpha: 0, scale: 0.2, transformOrigin: '50% 50%' as const, force3D: true }
    : {
        autoAlpha: 0,
        scale: 0.2,
        filter: 'blur(8px)',
        transformOrigin: '50% 50%' as const,
      };
  const pageRevealTo = lightweightReveal
    ? { autoAlpha: 1, scale: 1, force3D: true }
    : { autoAlpha: 1, scale: 1, filter: 'blur(0px)' };
  const ganeshaLift = lightweightReveal ? 16 : 28;
  const ganeshaMotion = lightweightReveal ? { force3D: true } : {};

  const context = gsap.context(() => {
    gsap.set(refs.root, { autoAlpha: 0 });
    gsap.set(refs.page, pageRevealFrom);
    gsap.set(refs.ganesha, {
      autoAlpha: 0,
      ...ganeshaCentered,
      y: ganeshaLift,
      scale: 0.88,
      transformOrigin: '50% 50%',
      ...ganeshaMotion,
    });
    gsap.set(refs.halo, {
      autoAlpha: 0,
      ...haloCentered,
      scale: 0.76,
      transformOrigin: '50% 50%',
      ...ganeshaMotion,
    });

    timeline = gsap.timeline({ paused: true });
    if (options.reducedMotion) {
      timeline
        .set(refs.root, { autoAlpha: 1 })
        .to(refs.page, { ...pageRevealTo, duration: 0.2 })
        .set(refs.goldenLight, { autoAlpha: 0 })
        .to(refs.halo, { ...haloCentered, autoAlpha: 1, scale: 1, duration: 0.2 })
        .to(refs.ganesha, { ...ganeshaCentered, autoAlpha: 1, scale: 1, y: 0, duration: 0.2 }, '<')
        .call(() => options.onComplete?.());
      return;
    }

    timeline
      .set(refs.root, { autoAlpha: 1 })
      // Every element begins moving in the same continuous cinematic beat.
      .to(refs.goldenLight, { autoAlpha: 0.46, scale: 1.1, duration: 0.52, ease: lightweightReveal ? 'none' : 'sine.inOut' }, 0)
      .to(refs.page, { ...pageRevealTo, duration: 1.24, ease: motionEase }, 0)
      .to(refs.halo, { ...haloCentered, autoAlpha: 0.76, scale: 1, duration: 0.81, ease: haloEase, ...ganeshaMotion }, 0.37)
      .to(refs.ganesha, { ...ganeshaCentered, autoAlpha: 1, scale: 1, y: 0, duration: 0.98, ease: motionEase, ...ganeshaMotion }, 0.5)
      .to(refs.goldenLight, { autoAlpha: 0, scale: 0.84, duration: 0.37, ease: lightweightReveal ? 'none' : 'sine.out' }, 0.96)
      .to(refs.halo, { ...haloCentered, autoAlpha: 0.28, scale: 1.13, duration: 0.36, ease: lightweightReveal ? 'none' : 'sine.inOut' }, 1.17)
      .call(() => options.onComplete?.(), [], 1.56);
  }, refs.root);

  return { play: () => timeline?.play(0), revert: () => context.revert() };
}
