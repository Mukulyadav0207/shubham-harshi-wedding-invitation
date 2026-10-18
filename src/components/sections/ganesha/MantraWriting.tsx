'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  acquireMantraAudio,
  ensureMantraAudioReady,
  getMantraAudioDuration,
  getMantraPlaybackElapsed,
  playMantraCue,
  playMantraHtml,
  getMantraHtmlPlaybackElapsed,
  MANTRA_PLAYBACK_TRIM_START_SEC,
  setMantraMuted,
  finishMantraPlaybackSession,
  stopMantraPlayback,
} from '@/audio/criticalAudio';
import { vivahTrace } from '@/lib/vivahTrace';
import styles from './MantraWriting.module.css';

type MantraTiming = { word: string; start: number; end: number };

/** File-time markers from navkar-mantra.mp3. Regenerate: node scripts/analyze-mantra.mjs */
const mantraTimingsFile: readonly MantraTiming[] = [
  { word: 'णमो अरिहंताणं', start: 0, end: 4.11 },
  { word: 'णमो सिद्धाणं', start: 4.16, end: 8.21 },
  { word: 'णमो आयरियाणं', start: 8.26, end: 12.05 },
  { word: 'णमो उवज्झायाणं', start: 12.1, end: 15.88 },
  { word: 'णमो लोए सव्व साहूणं', start: 15.93, end: 19.68 },
  { word: 'एसो पंच णमोकारो, सव्व पाव प्पणासणो ।', start: 19.73, end: 23.48 },
  { word: 'मंगलाणं च सव्वेसिं, पढमं हवइ मंगलम ॥', start: 23.53, end: 27.08 },
] as const;

const trim = MANTRA_PLAYBACK_TRIM_START_SEC;

/** Playback-time markers (after MANTRA_PLAYBACK_TRIM_START_SEC skip). */
export const mantraTimings: readonly MantraTiming[] = mantraTimingsFile.map(
  (line) => ({
    word: line.word,
    start: Math.max(0, line.start - trim),
    end: Math.max(0, line.end - trim),
  }),
);

const MANTRA_COMPLETE_PAUSE_MS = 650;
const MANTRA_AUDIO_FALLBACK_SECONDS = 28;
const NAVKAR_ARIA_LABEL =
  'णमो अरिहंताणं। णमो सिद्धाणं। णमो आयरियाणं। णमो उवज्झायाणं। णमो लोए सव्व साहूणं। एसो पंच णमोकारो, सव्व पाव प्पणासणो। मंगलाणं च सव्वेसिं, पढमं हवइ मंगलम॥';

const NAVKAR_WHITE_LINE_COUNT = 5;

type RevealState = {
  activeIndex: number;
  progress: number;
};

function getRevealState(elapsed: number): RevealState {
  let activeIndex = -1;
  for (let i = 0; i < mantraTimings.length; i += 1) {
    if (elapsed >= mantraTimings[i].start - 0.04) activeIndex = i;
  }
  if (activeIndex < 0) return { activeIndex: -1, progress: 0 };

  const timing = mantraTimings[activeIndex];
  const span = Math.max(0.2, timing.end - timing.start);
  const progress = Math.min(1, Math.max(0, (elapsed - timing.start) / span));
  return { activeIndex, progress };
}

function mantraSafetyTimeoutMs(audio?: HTMLAudioElement) {
  const audioDuration =
    getMantraAudioDuration() ||
    (audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : MANTRA_AUDIO_FALLBACK_SECONDS);
  return Math.ceil((audioDuration + 2.5) * 1000 + MANTRA_COMPLETE_PAUSE_MS);
}

function getAudioElapsedSeconds(
  usingWebAudio: boolean,
  mantraAudio?: HTMLAudioElement,
  wallClockStartedAt = 0,
) {
  if (wallClockStartedAt > 0) {
    return (performance.now() - wallClockStartedAt) / 1000;
  }
  if (usingWebAudio) return getMantraPlaybackElapsed();
  if (mantraAudio && !mantraAudio.paused) {
    return getMantraHtmlPlaybackElapsed(mantraAudio);
  }
  return 0;
}

type MantraWritingProps = {
  active: boolean;
  muted: boolean;
  playTriggerRef?: MutableRefObject<(() => void) | null>;
  onStart?: () => void;
  onComplete?: () => void;
  layout?: 'overlay' | 'embedded';
};

/** Navkar lines write in sync with audio; one line at a time. */
export default function MantraWriting({
  active,
  muted,
  playTriggerRef,
  onStart,
  onComplete,
  layout = 'overlay',
}: MantraWritingProps) {
  const [reveal, setReveal] = useState<RevealState>({
    activeIndex: -1,
    progress: 0,
  });
  const [showFrame, setShowFrame] = useState(false);
  const hasPlayedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const mutedRef = useRef(muted);
  const onStartRef = useRef(onStart);
  const onCompleteRef = useRef(onComplete);
  const playImplRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    setMantraMuted(muted);
  }, [muted]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let frame = 0;
    let safetyTimer: number | undefined;
    let mantraAudio: HTMLAudioElement | undefined;
    let playbackStarted = false;
    let usingWebAudio = false;
    let writingClockStartedAt = 0;

    const finish = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      setReveal({
        activeIndex: mantraTimings.length - 1,
        progress: 1,
      });
      finishMantraPlaybackSession();
      vivahTrace('mantra-finish', { action: 'on-complete' });
      onCompleteRef.current?.();
    };

    const scheduleCompletion = () => {
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(finish, MANTRA_COMPLETE_PAUSE_MS);
    };

    const scheduleSafetyTimeout = (audio?: HTMLAudioElement) => {
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(finish, mantraSafetyTimeoutMs(audio));
    };

    const startRevealLoop = () => {
      const tick = () => {
        if (hasCompletedRef.current) return;
        const elapsed = getAudioElapsedSeconds(
          usingWebAudio,
          mantraAudio,
          writingClockStartedAt,
        );
        setReveal(getRevealState(elapsed));
        const audioDuration =
          getMantraAudioDuration() ||
          (mantraAudio &&
          Number.isFinite(mantraAudio.duration) &&
          mantraAudio.duration > 0
            ? mantraAudio.duration
            : 0);
        const lastEnd = mantraTimings.at(-1)?.end ?? 0;
        if (
          (audioDuration > 0 && elapsed >= audioDuration - 0.05) ||
          elapsed >= lastEnd + 0.12
        ) {
          scheduleCompletion();
          return;
        }
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    const handleAudioEnded = () => {
      if (hasCompletedRef.current) return;
      if (frame) window.cancelAnimationFrame(frame);
      vivahTrace('audio-ended', { track: 'mantra' });
      setReveal({ activeIndex: mantraTimings.length - 1, progress: 1 });
      scheduleCompletion();
    };

    const onMantraPlaybackStarted = () => {
      if (playbackStarted) return;
      playbackStarted = true;
      mantraAudio = acquireMantraAudio() ?? undefined;
      writingClockStartedAt = 0;
      setShowFrame(true);
      onStartRef.current?.();
      startRevealLoop();
      scheduleSafetyTimeout(mantraAudio);
    };

    const play = () => {
      if (hasPlayedRef.current) return;
      hasPlayedRef.current = true;

      void ensureMantraAudioReady().then(() => {
        const volume = mutedRef.current ? 0 : 0.72;
        usingWebAudio = playMantraCue(volume, handleAudioEnded, onMantraPlaybackStarted);
        if (usingWebAudio) return;

        void playMantraHtml(volume, handleAudioEnded, onMantraPlaybackStarted).then(
          (ok) => {
            if (!ok && !playbackStarted) {
              playbackStarted = true;
              setShowFrame(true);
              onStartRef.current?.();
              writingClockStartedAt = performance.now();
              startRevealLoop();
              scheduleSafetyTimeout();
            }
          },
        );
      });
    };

    playImplRef.current = play;
    if (playTriggerRef) playTriggerRef.current = play;

    return () => {
      playImplRef.current = null;
      if (playTriggerRef) playTriggerRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      stopMantraPlayback();
      mantraAudio?.pause();
    };
  }, [playTriggerRef]);

  useEffect(() => {
    if (!active || hasPlayedRef.current) return;
    playImplRef.current?.();
  }, [active]);

  const renderNavkarLine = (lineIndex: number) => {
    const { activeIndex, progress } = reveal;
    if (lineIndex > activeIndex || activeIndex < 0) return null;

    const timing = mantraTimings[lineIndex];
    const accent = lineIndex >= NAVKAR_WHITE_LINE_COUNT;
    const isWriting = lineIndex === activeIndex;
    const isComplete = lineIndex < activeIndex;
    const clipInset = isWriting ? (1 - progress) * 100 : 0;

    return (
      <p
        key={lineIndex}
        className={`${styles.line} ${accent ? styles.lineAccent : styles.linePrimary} ${isComplete ? styles.lineComplete : ''}`}
        lang="sa"
      >
        <span
          className={styles.lineInk}
          style={
            isWriting
              ? { clipPath: `inset(0 ${clipInset}% 0 0)` }
              : undefined
          }
        >
          {timing.word}
        </span>
      </p>
    );
  };

  return (
    <div
      className={`${styles.mantra} ${layout === 'embedded' ? styles.mantraEmbedded : ''} ${showFrame ? styles.mantraVisible : ''}`}
      suppressHydrationWarning
      aria-label={NAVKAR_ARIA_LABEL}
      aria-live="polite"
    >
      <div
        className={`${styles.navkarFrame} ${showFrame ? styles.navkarFrameVisible : ''}`}
      >
        <div className={styles.navkarUpper}>
          {Array.from({ length: NAVKAR_WHITE_LINE_COUNT - 1 }, (_, index) =>
            renderNavkarLine(index),
          )}
          {renderNavkarLine(4)}
        </div>
        {reveal.activeIndex >= NAVKAR_WHITE_LINE_COUNT && (
          <div className={styles.navkarLower}>
            {Array.from(
              { length: mantraTimings.length - NAVKAR_WHITE_LINE_COUNT },
              (_, offset) => renderNavkarLine(NAVKAR_WHITE_LINE_COUNT + offset),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
