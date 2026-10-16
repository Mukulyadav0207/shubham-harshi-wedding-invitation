import { gsap } from 'gsap';
import { configureGsapPlatform, prefersLinearWebKitMotion } from '@/lib/gsapPlatform';

type CardTransitionRefs = { scene: HTMLElement; stage: HTMLElement; card: HTMLElement; light: HTMLElement };
type Options = { reducedMotion: boolean; onComplete?: () => void };
export type CardTransitionAnimation = { play: () => void; revert: () => void };

const cardCentered = {};

/** Carries the clean folded card through the envelope into a warm ivory transition. */
export function createCardTransitionAnimation(refs: CardTransitionRefs, options: Options): CardTransitionAnimation {
  configureGsapPlatform();
  let timeline: gsap.core.Timeline | undefined;
  const mobile = prefersLinearWebKitMotion();
  const liftOrigin = mobile ? '50% 55%' : '50% 52%';
  const liftYPercent = mobile ? -8 : -10;

  const context = gsap.context(() => {
    gsap.set(refs.light, { autoAlpha: 0, scale: 0.72, transformOrigin: '50% 50%' });

    timeline = gsap.timeline({ paused: true });
    if (options.reducedMotion) {
      timeline
        .to(refs.light, { autoAlpha: 1, scale: 1.3, duration: 0.25, ease: 'sine.out' })
        .set([refs.card, refs.stage], { autoAlpha: 0 })
        .call(() => options.onComplete?.());
      return;
    }

    timeline
      .set(refs.card, { zIndex: 10 })
      // One unbroken transform tween keeps the card moving at the timeline
      // boundary instead of easing to a stop between separate zoom stages.
      .to(refs.card, {
        ...cardCentered,
        z: mobile ? 300 : 420,
        zIndex: 10,
        yPercent: liftYPercent,
        scale: mobile ? 3.8 : 4.6,
        rotateX: mobile ? 1.6 : 2.2,
        rotateY: 0,
        rotateZ: 0,
        transformOrigin: liftOrigin,
        duration: 0.92,
        ease: 'none',
        force3D: true,
      })
      // Light grows from the invitation centre and absorbs the final edge of the card.
      .to(refs.light, { autoAlpha: 0.72, scale: 1.32, duration: 0.26, ease: 'sine.out' }, 0.52)
      .to(refs.card, { autoAlpha: 0.16, duration: 0.16, ease: 'sine.out' }, '-=0.08')
      .to(refs.light, { autoAlpha: 1, scale: 1.78, duration: 0.24, ease: 'sine.inOut' }, '-=0.04')
      .set([refs.card, refs.stage], { autoAlpha: 0 })
      .call(() => options.onComplete?.());
  }, refs.scene);

  return { play: () => timeline?.play(0), revert: () => context.revert() };
}
