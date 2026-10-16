import { gsap } from "gsap";
import { isMobileMotionViewport } from "@/lib/motion";

export const ENVELOPE_LIGHT_TIMING = {
  sealResponse: 0.22,
  sequenceDuration: 1.48,
} as const;

export type EnvelopeLightRefs = {
  scene: HTMLElement;
  seal: HTMLElement;
  floralPaths: HTMLElement[];
  glints: HTMLElement[];
};

type Options = { reducedMotion: boolean; onComplete: () => void };
export type EnvelopeLightSequence = { play: () => void; revert: () => void };

/** A short, one-shot reflected-light pass across the existing envelope artwork. */
export function createEnvelopeLightSequence(
  refs: EnvelopeLightRefs,
  options: Options,
): EnvelopeLightSequence {
  let timeline: gsap.core.Timeline | undefined;
  const lightweight = isMobileMotionViewport();

  const context = gsap.context(() => {
    const allLight = [...refs.floralPaths, ...refs.glints];
    gsap.set(allLight, { autoAlpha: 0 });
    gsap.set(refs.seal, {
      scale: 1,
      filter: lightweight ? "none" : "brightness(1) saturate(1)",
      transformOrigin: "50% 50%",
      willChange: lightweight ? "transform" : "transform, filter",
    });

    timeline = gsap.timeline({ paused: true });
    if (options.reducedMotion) {
      timeline!
        .to(refs.seal, { scale: 1.02, duration: 0.12 })
        .to(refs.floralPaths, { autoAlpha: 0.22, duration: 0.12 }, 0)
        .to(refs.floralPaths, { autoAlpha: 0, duration: 0.2 })
        .set(refs.seal, { clearProps: "willChange" })
        .call(options.onComplete);
      return;
    }

    timeline
      // A restrained seal reaction establishes the light source.
      .to(refs.seal, lightweight
        ? { scale: 1.024, duration: ENVELOPE_LIGHT_TIMING.sealResponse, ease: "sine.out" }
        : {
            scale: 1.028,
            filter: "brightness(1.12) saturate(1.07) drop-shadow(0 0 8px rgba(255, 208, 104, .38))",
            duration: ENVELOPE_LIGHT_TIMING.sealResponse,
            ease: "sine.out",
          })
      .to(refs.seal, { scale: 1, duration: 0.32, ease: "sine.inOut" }, 0.22)
    // Short fields are sequenced along the relief: no path is visible by itself.
    const floralPasses = [
      { at: 0.18, opacity: 0.3, driftX: 4, driftY: -10, duration: 0.26 },
      { at: 0.34, opacity: 0.26, driftX: -10, driftY: -5, duration: 0.3 },
      { at: 0.43, opacity: 0.25, driftX: 9, driftY: -5, duration: 0.3 },
      { at: 0.6, opacity: 0.22, driftX: -4, driftY: -13, duration: 0.28 },
      { at: 0.69, opacity: 0.22, driftX: 5, driftY: -12, duration: 0.28 },
      { at: 0.82, opacity: 0.28, driftX: 2, driftY: -15, duration: 0.32 },
    ];
    floralPasses.forEach(({ at, opacity, driftX, driftY, duration }, index) => {
      const path = refs.floralPaths[index];
      if (!path) return;
      timeline!
        .fromTo(
          path,
          { x: 0, y: 0, scaleX: 0.38, scaleY: 0.72, autoAlpha: 0 },
          { x: driftX, y: driftY, scaleX: 1.06, scaleY: 1, autoAlpha: opacity, duration: duration * 0.52, ease: "sine.out" },
          at,
        )
        .to(path, { x: driftX * 1.5, y: driftY * 1.45, scaleX: 0.72, scaleY: 0.78, autoAlpha: 0, duration: duration * 0.54, ease: "sine.in" }, at + duration * 0.46);
    });

    refs.glints.forEach((glint, index) => {
      if (lightweight && index > 2) return;
      const start = 0.48 + index * 0.085;
      const driftX = [-7, 5, -4, 8, 3, -6, 7, -3][index] ?? 0;
      const driftY = [-10, -7, 6, -11, 8, -5, 5, -8][index] ?? 0;
      timeline!
        .fromTo(glint, { x: 0, y: 0, scale: 0.48, autoAlpha: 0 }, { x: driftX, y: driftY, scale: 1, autoAlpha: index % 3 === 0 ? 0.94 : 0.65, duration: 0.16, ease: "sine.out" }, start)
        .to(glint, { x: driftX * 1.6, y: driftY * 1.5, scale: 0.6, autoAlpha: 0, duration: 0.28, ease: "sine.in" }, start + 0.16);
    });

    timeline
      .to(
        refs.seal,
        lightweight
          ? { duration: 0.28, ease: "sine.out" }
          : {
              filter: "brightness(1.04) saturate(1.02) drop-shadow(0 0 5px rgba(255, 208, 104, .2))",
              duration: 0.28,
              ease: "sine.out",
            },
        1.05,
      )
      .to(
        refs.seal,
        lightweight
          ? { duration: 0.28, ease: "sine.inOut" }
          : { filter: "brightness(1) saturate(1)", duration: 0.28, ease: "sine.inOut" },
        1.28,
      )
      .set(refs.seal, { clearProps: "willChange" }, ENVELOPE_LIGHT_TIMING.sequenceDuration)
      .call(options.onComplete, [], ENVELOPE_LIGHT_TIMING.sequenceDuration);
  }, refs.scene);

  return { play: () => timeline?.play(0), revert: () => context.revert() };
}
