"use client";

import { useEffect, useRef, type RefObject } from "react";

const DEFAULT_ROOT_MARGIN = "0px 0px -48px 0px";
const DEFAULT_THRESHOLD = 0.16;

/** Adds a class once when a section enters the viewport, without scroll listeners. */
export function useViewportReveal<T extends HTMLElement>(
  revealedClassName: string,
  options: IntersectionObserverInit = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add(revealedClassName);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.classList.add(revealedClassName);
        observer.unobserve(element);
      },
      {
        threshold: DEFAULT_THRESHOLD,
        rootMargin: DEFAULT_ROOT_MARGIN,
        ...optionsRef.current,
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [revealedClassName]);

  return ref;
}
