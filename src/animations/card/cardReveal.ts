import { gsap } from 'gsap';
import { configureGsapPlatform, prefersLinearWebKitMotion } from '@/lib/gsapPlatform';

type CardRevealRefs = { scene: HTMLElement; card: HTMLElement; envelopeVeil: HTMLElement };
type Options = { reducedMotion: boolean; onStart?: () => void; onComplete: () => void };
export type CardRevealAnimation = { play: () => void; revert: () => void };

const cardCentered = {};

/** Lifts the folded card smoothly out of the envelope pocket toward the viewer. */
export function createCardRevealAnimation(refs: CardRevealRefs, options: Options): CardRevealAnimation {
  configureGsapPlatform();
  let timeline: gsap.core.Timeline | undefined;
  const mobile = prefersLinearWebKitMotion();
  const pocketOrigin = mobile ? '50% 55%' : '50% 52%';
  const liftYPercent = mobile ? -8 : -10;

  const context = gsap.context(() => {
    gsap.set(refs.card, {
      autoAlpha: 1,
      ...cardCentered,
      yPercent: 0,
      // Keep the card behind the front pocket until it has physically cleared it.
      z: -1,
      scale: 0.9,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      transformOrigin: pocketOrigin,
      transformStyle: 'preserve-3d',
      force3D: true,
    });
    gsap.set(refs.envelopeVeil, { autoAlpha: 0 });

    timeline = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut' } });
    if (options.onStart) timeline.call(options.onStart);
    if (options.reducedMotion) {
      timeline
        .set(refs.card, {
          autoAlpha: 1,
          ...cardCentered,
          yPercent: liftYPercent,
          z: 28,
          zIndex: 10,
          scale: 1.16,
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          transformOrigin: pocketOrigin,
        })
        .set(refs.envelopeVeil, { autoAlpha: 0.5 })
        .call(options.onComplete);
      return;
    }

    timeline
      .set(refs.card, { zIndex: 10 })
      // Transform-only motion avoids a layout/compositing pause as the card
      // crosses the envelope lip and comes toward the viewer.
      .to(refs.card, {
        ...cardCentered,
        yPercent: liftYPercent,
        z: mobile ? 32 : 36,
        zIndex: 10,
        scale: mobile ? 1.08 : 1.1,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        transformOrigin: pocketOrigin,
        duration: 1.04,
        // Do not decelerate to a stop here: cardTransition continues this
        // exact physical movement toward the viewer.
        ease: 'none',
        force3D: true,
      })
      .to(refs.envelopeVeil, { autoAlpha: 0.42, duration: 0.36, ease: 'sine.out' }, 0.56)
      .call(options.onComplete);
  }, refs.scene);

  return { play: () => timeline?.play(0), revert: () => context.revert() };
}
