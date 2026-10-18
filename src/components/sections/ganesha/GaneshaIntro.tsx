'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createGaneshaRevealAnimation } from '@/animations/ganesha/ganeshaReveal';
import { masterTimeline, MasterPhase } from '@/animations/masterTimeline';
import { ensureMantraAudioReady } from '@/audio/criticalAudio';
import { vivahTrace } from '@/lib/vivahTrace';
import MantraWriting from './MantraWriting';
import styles from './GaneshaIntro.module.css';

type GaneshaIntroProps = {
  active: boolean;
  muted: boolean;
  onComplete?: () => void;
  onMantraStart?: () => void;
  dissolving?: boolean;
  /** In-document spiritual block above the invite hero (scrollable site). */
  layout?: 'overlay' | 'embedded';
};

/** The sacred invitation page that emerges from the envelope's final light. */
export default function GaneshaIntro({
  active,
  muted,
  onComplete,
  onMantraStart,
  dissolving = false,
  layout = 'overlay',
}: GaneshaIntroProps) {
  const embedded = layout === 'embedded';
  const rootRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const ganeshaMotionRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const goldenLightRef = useRef<HTMLSpanElement>(null);
  const playRef = useRef<(() => void) | null>(null);
  const playMantraRef = useRef<(() => void) | null>(null);
  const [mantraActive, setMantraActive] = useState(false);
  const [prayerVisible, setPrayerVisible] = useState(false);
  const handleRevealComplete = useCallback(() => {
    vivahTrace('ganesha-reveal-complete', { action: 'start-mantra' });
    masterTimeline.setPhase(MasterPhase.MantraIntro);
    playMantraRef.current?.();
    setMantraActive(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setPrayerVisible(false);
      setMantraActive(false);
      return undefined;
    }
    vivahTrace('ganesha-active', { action: 'reveal-playing' });
    masterTimeline.setPhase(MasterPhase.GaneshaReveal);
    void ensureMantraAudioReady();
    const prayerTimer = window.setTimeout(() => setPrayerVisible(true), 1050);
    return () => window.clearTimeout(prayerTimer);
  }, [active]);

  useEffect(() => {
    if (!rootRef.current || !pageRef.current || !ganeshaMotionRef.current || !haloRef.current || !goldenLightRef.current) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = createGaneshaRevealAnimation({ root: rootRef.current, page: pageRef.current, ganesha: ganeshaMotionRef.current, halo: haloRef.current, goldenLight: goldenLightRef.current }, { reducedMotion, onComplete: handleRevealComplete });
    playRef.current = animation.play;
    return () => { playRef.current = null; animation.revert(); };
  }, [goldenLightRef, handleRevealComplete]);

  useEffect(() => {
    if (active) playRef.current?.();
  }, [active]);

  return (
    <section
      ref={rootRef}
      id={embedded ? 'spiritual' : undefined}
      className={`${styles.ganeshaIntro} ${embedded ? styles.embedded : ''} ${dissolving ? styles.dissolving : ''}`}
      aria-hidden={embedded ? undefined : !active}
    >
    <span ref={goldenLightRef} className={styles.goldenLight} aria-hidden="true" />
    <span className={styles.ambientBackground} aria-hidden="true" />
    <div className={styles.ambientParticles} aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => <span key={index} />)}
    </div>
    <div ref={pageRef} className={styles.invitationPage}>
      {!embedded && (
        <Image
          className={styles.pageArtwork}
          src="/assets/images/ganesha/ganesha-bg-page.webp"
          width={941}
          height={1672}
          alt=""
          priority
          sizes="(max-width: 760px) 100vw, 560px"
        />
      )}
      <span
        className={`${styles.divineLight} ${active && !dissolving && !mantraActive ? styles.divineLightLive : ""}`}
        aria-hidden="true"
      />
      {embedded ? (
        <div
          className={`${styles.spiritualPanel} ${prayerVisible ? styles.spiritualPanelLive : ''}`}
        >
          <div className={styles.ganeshaFigureZone}>
            <span ref={haloRef} className={styles.ganeshaHalo} aria-hidden="true" />
            {prayerVisible && (
              <p className={styles.ganeshaPrayer} lang="sa">
                श्री महावीराय नमः
              </p>
            )}
            <div ref={ganeshaMotionRef} className={styles.ganeshaArtworkWrap}>
              <Image
                className={styles.ganeshaArtwork}
                src="/assets/images/ganesha/mahavir-bhagwan.webp"
                width={1024}
                height={1536}
                alt="Bhagwan Mahavir"
                priority
                sizes="(max-width: 760px) 72vw, 400px"
              />
            </div>
          </div>
          <MantraWriting
            layout="embedded"
            active={mantraActive}
            muted={muted}
            playTriggerRef={playMantraRef}
            onStart={onMantraStart}
            onComplete={onComplete}
          />
        </div>
      ) : (
        <>
          <div className={styles.ganeshaFigureZone}>
            <span ref={haloRef} className={styles.ganeshaHalo} aria-hidden="true" />
            {prayerVisible && (
              <p className={styles.ganeshaPrayer} lang="sa">
                श्री महावीराय नमः
              </p>
            )}
            <div ref={ganeshaMotionRef} className={styles.ganeshaArtworkWrap}>
              <Image
                className={styles.ganeshaArtwork}
                src="/assets/images/ganesha/mahavir-bhagwan.webp"
                width={1024}
                height={1536}
                alt="Bhagwan Mahavir"
                priority
                sizes="(max-width: 760px) 72vw, 400px"
              />
            </div>
          </div>
          <MantraWriting
            layout="overlay"
            active={mantraActive}
            muted={muted}
            playTriggerRef={playMantraRef}
            onStart={onMantraStart}
            onComplete={onComplete}
          />
        </>
      )}
    </div>
  </section>
  );
}
