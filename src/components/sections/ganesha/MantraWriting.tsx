'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  acquireMantraAudio,
  ensureMantraAudioReady,
  getMantraAudioDuration,
  playMantraCue,
  playMantraHtml,
  getMantraSyncElapsed,
  setMantraMuted,
  finishMantraPlaybackSession,
  stopMantraPlayback,
} from '@/audio/criticalAudio';
import { vivahTrace } from '@/lib/vivahTrace';
import { mantraTimingsPlayback } from './mantraSync';
import styles from './MantraWriting.module.css';

const mantraTimings = mantraTimingsPlayback;
const NAVKAR_WHITE_LINE_COUNT = 5;

/** Pause after mantra audio ends before scroll. */
const MANTRA_COMPLETE_PAUSE_MS = 1000;
const MANTRA_AUDIO_FALLBACK_SECONDS = 48;

const NAVKAR_ARIA_LABEL =
  'णमो अरिहंताणं। णमो सिद्धाणं। णमो आयरियाणं। णमो उवज्झायाणं। णमो लोए सव्व साहूणं। एसो पंच णमोकारो, सव्व पाव प्पणासणो। मंगलाणं च सव्वेसिं, पढमं हवइ मंगलम॥';

type RevealState = {
  activeIndex: number;
  progress: number;
  elapsed: number;
};

/** Ink 0–1 across the phrase window (includes trailing । / ॥). */
function getLineInkProgress(lineIndex: number, elapsed: number): number {
  const timing = mantraTimings[lineIndex];
  if (!timing) return 0;
  if (elapsed <= timing.start) return 0;
  if (elapsed >= timing.end) return 1;

  const span = Math.max(0.12, timing.end - timing.start);
  return Math.min(1, (elapsed - timing.start) / span);
}

function getRevealState(elapsed: number): RevealState {
  let activeIndex = -1;
  for (let i = 0; i < mantraTimings.length; i += 1) {
    if (elapsed >= mantraTimings[i].start) activeIndex = i;
  }
  if (activeIndex < 0) return { activeIndex: -1, progress: 0, elapsed };

  const progress = getLineInkProgress(activeIndex, elapsed);
  return { activeIndex, progress, elapsed };
}

function mantraSafetyTimeoutMs(audio?: HTMLAudioElement) {
  const audioDuration =
    getMantraAudioDuration() ||
    (audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : MANTRA_AUDIO_FALLBACK_SECONDS);
  return Math.ceil((audioDuration + 2.5) * 1000 + MANTRA_COMPLETE_PAUSE_MS);
}

function getWritingElapsedSeconds(wallClockStartedAt = 0) {
  if (wallClockStartedAt > 0) {
    return (performance.now() - wallClockStartedAt) / 1000;
  }
  return getMantraSyncElapsed();
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
    elapsed: 0,
  });
  const [showFrame, setShowFrame] = useState(false);
  const [inkSynced, setInkSynced] = useState(false);
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
    let frozenElapsed = 0;
    let mantraAudioEnded = false;
    let completionQueued = false;

    const allLinesWritten = (elapsed: number) =>
      elapsed >= (mantraTimings.at(-1)?.end ?? 0) - 0.02;

    const finish = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      setReveal({
        activeIndex: mantraTimings.length - 1,
        progress: 1,
        elapsed: Math.max(frozenElapsed, mantraTimings.at(-1)?.end ?? 0),
      });
      finishMantraPlaybackSession();
      vivahTrace('mantra-finish', { action: 'on-complete' });
      onCompleteRef.current?.();
    };

    const scheduleCompletion = () => {
      if (hasCompletedRef.current) return;
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(finish, MANTRA_COMPLETE_PAUSE_MS);
    };

    const scheduleSafetyTimeout = (audio?: HTMLAudioElement) => {
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(finish, mantraSafetyTimeoutMs(audio));
    };

    const resolvePlaybackElapsed = () => {
      const live = getWritingElapsedSeconds(writingClockStartedAt);
      if (live > 0) {
        frozenElapsed = live;
        return live;
      }
      return frozenElapsed;
    };

    const maybeQueueCompletion = (elapsed: number) => {
      if (!mantraAudioEnded || completionQueued || hasCompletedRef.current) return;
      if (allLinesWritten(elapsed)) {
        completionQueued = true;
        scheduleCompletion();
      }
    };

    const startRevealLoop = () => {
      const tick = () => {
        if (hasCompletedRef.current) return;

        const elapsed = mantraAudioEnded ? frozenElapsed : resolvePlaybackElapsed();
        if (!mantraAudioEnded) frozenElapsed = elapsed;
        setReveal(getRevealState(elapsed));
        maybeQueueCompletion(elapsed);

        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    const handleAudioEnded = () => {
      if (hasCompletedRef.current || mantraAudioEnded) return;
      mantraAudioEnded = true;
      const lastEnd = mantraTimings.at(-1)?.end ?? 0;
      frozenElapsed = Math.max(resolvePlaybackElapsed(), lastEnd);
      if (safetyTimer) {
        window.clearTimeout(safetyTimer);
        safetyTimer = undefined;
      }
      vivahTrace('audio-ended', { track: 'mantra' });
      setReveal({
        activeIndex: mantraTimings.length - 1,
        progress: 1,
        elapsed: frozenElapsed,
      });
      completionQueued = true;
      scheduleCompletion();
    };

    const onMantraPlaybackStarted = () => {
      if (playbackStarted) return;
      playbackStarted = true;
      mantraAudio = acquireMantraAudio() ?? undefined;
      writingClockStartedAt = 0;
      setInkSynced(true);
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
      if (!hasCompletedRef.current) {
        stopMantraPlayback();
        mantraAudio?.pause();
      }
    };
  }, [playTriggerRef]);

  useEffect(() => {
    if (!active || hasPlayedRef.current) return;
    playImplRef.current?.();
  }, [active]);

  const renderNavkarLine = (lineIndex: number) => {
    if (!inkSynced) return null;
    const { activeIndex, elapsed } = reveal;
    if (lineIndex > activeIndex || activeIndex < 0) return null;

    const timing = mantraTimings[lineIndex];
    const accent = lineIndex >= NAVKAR_WHITE_LINE_COUNT;
    const lineProgress = getLineInkProgress(lineIndex, elapsed);
    const isFullyWritten =
      lineIndex < activeIndex ||
      elapsed >= timing.end - 0.02 ||
      lineProgress >= 0.998;
    const clipInset = isFullyWritten ? 0 : (1 - lineProgress) * 100;

    return (
      <p
        key={lineIndex}
        className={`${styles.line} ${accent ? styles.lineAccent : styles.linePrimary} ${isFullyWritten ? styles.lineComplete : ''}`}
        lang="sa"
      >
        <span
          className={styles.lineInk}
          style={
            isFullyWritten
              ? undefined
              : { clipPath: `inset(0 ${clipInset}% 0 0)` }
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
