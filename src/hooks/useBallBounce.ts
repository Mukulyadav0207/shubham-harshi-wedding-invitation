"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  BALL_BOUNCE_DURATION_MS,
  ballBounceTransformAt,
  playBallBounceAnimation,
  type BallBounceConfig,
} from "@/lib/ballBounce";

type UseBallBounceOptions = {
  enabled?: boolean;
  config?: BallBounceConfig;
  durationMs?: number;
  getScrollProgress: (element: HTMLElement) => number;
};

export function useBallBounce(
  elementRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    config,
    durationMs = BALL_BOUNCE_DURATION_MS,
    getScrollProgress,
  }: UseBallBounceOptions,
) {
  const settledRef = useRef(false);
  const tapAnimatingRef = useRef(false);
  const smoothProgressRef = useRef(0);
  const [settled, setSettled] = useState(false);
  const [animating, setAnimating] = useState(false);

  const playBounce = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    settledRef.current = true;
    tapAnimatingRef.current = true;
    smoothProgressRef.current = 1;
    setSettled(true);
    setAnimating(true);

    const animation = playBallBounceAnimation(element, config, durationMs);
    animation.onfinish = () => {
      tapAnimatingRef.current = false;
      setAnimating(false);
      element.style.transform = ballBounceTransformAt(1, config);
    };
    animation.oncancel = () => {
      tapAnimatingRef.current = false;
      setAnimating(false);
    };
  }, [config, durationMs, elementRef]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let frameId = 0;

    const tick = () => {
      frameId = 0;
      if (tapAnimatingRef.current) return;

      const target = getScrollProgress(element);
      const delta = target - smoothProgressRef.current;

      if (settledRef.current) {
        if (target < 0.96) {
          settledRef.current = false;
          setSettled(false);
        } else {
          element.style.transform = ballBounceTransformAt(1, config);
          return;
        }
      }

      if (Math.abs(delta) > 0.0006) {
        smoothProgressRef.current += delta * 0.16;
        element.style.transform = ballBounceTransformAt(
          smoothProgressRef.current,
          config,
        );
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      smoothProgressRef.current = target;
      element.style.transform = ballBounceTransformAt(target, config);

      if (target >= 0.995) {
        settledRef.current = true;
        setSettled(true);
        element.style.transform = ballBounceTransformAt(1, config);
      }
    };

    const onScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    tick();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
      element.style.transform = "";
    };
  }, [config, enabled, getScrollProgress, elementRef]);

  return { playBounce, settled, animating };
}
