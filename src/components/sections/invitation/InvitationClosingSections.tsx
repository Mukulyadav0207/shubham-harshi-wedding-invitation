"use client";

import { useEffect, useRef, useState } from "react";
import { closingContent } from "./closingData";
import { familyIntro } from "./familyData";
import { useBallBounce } from "@/hooks/useBallBounce";
import { getElementViewportScrollProgress } from "@/lib/ballBounce";
import styles from "./InvitationClosingSections.module.css";

// Gallery (“Our Memories”) — disabled for now. Re-enable nav + InvitationHero render when restoring.
export function StoryMomentsSection() {
  return null;
}

const FAMILY_LIGHTS_DELAY_MS = 2000;

const getMonogramScrollProgress = (element: HTMLElement) =>
  getElementViewportScrollProgress(element, 0.98, 0.28);

const familyMonogramBounceConfig = {
  peak: 54,
  bounceCount: 5.4,
  damping: 4.1,
};

function FamilyDetailText({
  text,
  className,
}: {
  text: string | readonly string[];
  className: string;
}) {
  const lines = typeof text === "string" ? [text] : text;
  if (lines.length === 1) {
    return <p className={className}>{lines[0]}</p>;
  }
  return (
    <p className={`${className} ${styles.familyDetailMultiline}`}>
      {lines.map((line) => (
        <span className={styles.familyDetailLine} key={line}>
          {line}
        </span>
      ))}
    </p>
  );
}

export function FamilyLoveSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const monogramRingRef = useRef<HTMLSpanElement>(null);
  const [lightsOn, setLightsOn] = useState(false);
  const [visible, setVisible] = useState(false);

  const { playBounce: playMonogramBounce } = useBallBounce(monogramRingRef, {
    getScrollProgress: getMonogramScrollProgress,
    config: familyMonogramBounceConfig,
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        revealObserver.unobserve(section);
      },
      { threshold: 0.18, rootMargin: "0px 0px -48px 0px" },
    );
    revealObserver.observe(section);

    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    let timerId: number | undefined;
    const lightsObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (timerId) window.clearTimeout(timerId);
          timerId = undefined;
          setLightsOn(false);
          return;
        }

        if (timerId) window.clearTimeout(timerId);
        timerId = window.setTimeout(() => {
          setLightsOn(true);
          timerId = undefined;
        }, FAMILY_LIGHTS_DELAY_MS);
      },
      { threshold: 0.15 },
    );

    lightsObserver.observe(section);
    return () => {
      lightsObserver.disconnect();
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  const toggleLights = () => setLightsOn((on) => !on);

  const { groom, bride, monogram, footer } = familyIntro;

  return (
    <section
      id="families"
      ref={sectionRef}
      className={`${styles.section} ${styles.family} ${lightsOn ? styles.familyLightsOn : ""} ${visible ? styles.familyVisible : ""}`}
      aria-labelledby="family-intro-title"
      onClick={toggleLights}
    >
      <div className={styles.familyIntro}>
        <header className={styles.familyHeader}>
          <p className={styles.familyTagline}>{familyIntro.tagline}</p>
          <span className={styles.familyFlourish} aria-hidden="true">
            <i />
            <b>✦</b>
            <i />
          </span>
          <h2 id="family-intro-title" className={styles.familyTitle}>
            {familyIntro.title}
          </h2>
          <p className={styles.familyScriptHeading}>
            {familyIntro.scriptTitle}
          </p>
        </header>

        <div className={styles.familyColumns}>
          <article
            className={`${styles.familyBlock} ${styles.familyBlockGroom}`}
          >
            <p className={styles.familyName}>{groom.name}</p>
            <p className={styles.familyGrandparentsLabel}>
              {groom.grandparentsLabel}
            </p>
            <FamilyDetailText
              className={styles.familyParents}
              text={groom.grandparents}
            />
            <p className={styles.familyRelation}>{groom.parentsLabel}</p>
            <p className={styles.familyParents}>{groom.parents}</p>
            <span className={styles.familySeparator} aria-hidden="true" />
            <p className={styles.familySiblingLabel}>{groom.siblingLabel}</p>
            <p className={styles.familySiblings}>{groom.siblings}</p>
            {groom.extraRelationLabel && groom.extraRelation ? (
              <>
                <p className={styles.familySiblingLabel}>
                  {groom.extraRelationLabel}
                </p>
                <p className={styles.familySiblings}>{groom.extraRelation}</p>
              </>
            ) : null}
          </article>

          <div
            className={styles.familyMonogram}
            onClick={(event) => {
              event.stopPropagation();
              playMonogramBounce();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              playMonogramBounce();
            }}
            role="button"
            tabIndex={0}
            aria-label="Bounce the monogram"
          >
            <span ref={monogramRingRef} className={styles.familyMonogramRing}>
              <span className={styles.familyMonogramBotanical} />
              <span className={styles.familyMonogramInitials}>
                {monogram.left}
                <span className={styles.familyMonogramHeart}>♥</span>
                {monogram.right}
              </span>
            </span>
          </div>

          <article
            className={`${styles.familyBlock} ${styles.familyBlockBride}`}
          >
            <p className={styles.familyName}>{bride.name}</p>
            <p className={styles.familyGrandparentsLabel}>
              {bride.grandparentsLabel}
            </p>
            <FamilyDetailText
              className={styles.familyParents}
              text={bride.grandparents}
            />
            <p className={styles.familyRelation}>{bride.parentsLabel}</p>
            <p className={styles.familyParents}>{bride.parents}</p>
            <span className={styles.familySeparator} aria-hidden="true" />
            <p className={styles.familySiblingLabel}>{bride.siblingLabel}</p>
            <p className={styles.familySiblings}>{bride.siblings}</p>
          </article>
        </div>

        <footer className={styles.familyFooter}>
          <p className={styles.familyQuote}>
            {footer.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <span className={styles.familyFlourish} aria-hidden="true">
            <i />
            <b>✦</b>
            <i />
          </span>
          <p className={styles.familyScriptFooter}>{footer.script}</p>
        </footer>
      </div>
    </section>
  );
}

export function ClosingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.unobserve(section);
      },
      { threshold: 0.2, rootMargin: "0px 0px -48px 0px" },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="blessings"
      ref={sectionRef}
      className={`${styles.section} ${styles.closing} ${visible ? styles.closingVisible : ""}`}
      aria-labelledby="closing-title"
    >
      <div className={styles.closingContent}>
        <h2 id="closing-title" className={styles.thankYouTitle}>
          {closingContent.title}
        </h2>
        <p className={styles.thankYouSubtitle}>{closingContent.subtitle}</p>
        <p className={styles.thankYouPresent}>{closingContent.present}</p>
        <p className={styles.thankYouMessage}>
          {closingContent.message.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>
    </section>
  );
}
