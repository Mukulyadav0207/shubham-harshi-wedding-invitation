'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { gsap } from 'gsap';
import { configureGsapPlatform, prefersLinearWebKitMotion } from '@/lib/gsapPlatform';
import { isIOSDevice } from '@/lib/motion';
import {
  acquireMantraAudio,
  ensureMantraAudioReady,
  getMantraAudioDuration,
  getMantraPlaybackElapsed,
  playMantraCue,
  registerMantraPlaybackStart,
  setMantraMuted,
  finishMantraPlaybackSession,
  stopMantraPlayback,
} from '@/audio/criticalAudio';
import { vivahTrace } from '@/lib/vivahTrace';
import styles from './MantraWriting.module.css';

type MantraTiming = { word: string; start: number; end: number };

/**
 * Word markers aligned to ganesha-mantra.mp3 (~18.8s).
 * Regenerate: node scripts/analyze-mantra.mjs
 */
export const mantraTimings: readonly MantraTiming[] = [
  { word: 'वक्रतुण्ड', start: 0, end: 2.16 },
  { word: 'महाकाय', start: 2.21, end: 4.37 },
  { word: 'सूर्यकोटि', start: 4.42, end: 6.58 },
  { word: 'समप्रभः', start: 6.63, end: 8.78 },
  { word: 'निर्विघ्नं', start: 8.83, end: 10.44 },
  { word: 'कुरु', start: 10.49, end: 11.54 },
  { word: 'मे', start: 11.59, end: 12.1 },
  { word: 'देव', start: 12.15, end: 13.2 },
  { word: 'शुभकार्येषु', start: 13.25, end: 15.96 },
  { word: 'सर्वदा॥', start: 16.01, end: 17.97 },
] as const;

const CALLIGRAPHY_SOUND_SRC: string | null = null;
/** Slightly slower calligraphy — starts a touch early so each word still lands with the audio. */
const MANTRA_WRITE_STRETCH = 1.12;
const MANTRA_TAIL_PAD = 1.25;
const MANTRA_COMPLETE_PAUSE_MS = 500;
const MANTRA_AUDIO_FALLBACK_SECONDS = 20;
const groups = [mantraTimings.slice(0, 4), mantraTimings.slice(4)];

type LetterPlan = {
  wordIndex: number;
  letterIndex: number;
  grapheme: string;
  start: number;
  end: number;
};

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [
      ...new Intl.Segmenter('sa', { granularity: 'grapheme' }).segment(text),
    ].map((part) => part.segment);
  }
  return [...text];
}

const mantraWordGraphemes = mantraTimings.map((timing) =>
  splitGraphemes(timing.word),
);

function wordAudioSpan(timing: MantraTiming) {
  return timing.end - timing.start;
}

function wordRevealDuration(index: number, timing: MantraTiming) {
  const stretched = wordAudioSpan(timing) * MANTRA_WRITE_STRETCH;
  if (index === mantraTimings.length - 1) return stretched + MANTRA_TAIL_PAD;
  return stretched;
}

function wordRevealStart(timing: MantraTiming) {
  const lead = wordAudioSpan(timing) * (MANTRA_WRITE_STRETCH - 1);
  return Math.max(0, timing.start - lead);
}

const mantraLetterPlan: LetterPlan[] = mantraTimings.flatMap((timing, wordIndex) => {
  const graphemes = mantraWordGraphemes[wordIndex];
  const wordStart = wordRevealStart(timing);
  const wordDuration = wordRevealDuration(wordIndex, timing);
  const perLetter = wordDuration / graphemes.length;
  return graphemes.map((grapheme, letterIndex) => ({
    wordIndex,
    letterIndex,
    grapheme,
    start: wordStart + letterIndex * perLetter,
    end: wordStart + (letterIndex + 1) * perLetter,
  }));
});

const letterPlanBaseByWord = mantraWordGraphemes.map((_, wordIndex) =>
  mantraLetterPlan.findIndex(
    (plan) => plan.wordIndex === wordIndex && plan.letterIndex === 0,
  ),
);

function mantraTimelineDuration() {
  return mantraTimings.reduce((max, timing, index) => {
    const visualEnd = wordRevealStart(timing) + wordRevealDuration(index, timing);
    return Math.max(max, visualEnd, timing.end);
  }, 0);
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
  if (mantraAudio && !mantraAudio.paused) return mantraAudio.currentTime;
  return 0;
}

function setLetterVisibility(letters: HTMLSpanElement[], elapsed: number) {
  mantraLetterPlan.forEach((plan, index) => {
    const letter = letters[index];
    if (!letter) return;
    if (elapsed < plan.start) {
      letter.style.opacity = '0';
      letter.style.clipPath = 'inset(0 100% 0 0)';
      return;
    }
    if (elapsed >= plan.end) {
      letter.style.opacity = '1';
      letter.style.clipPath = 'inset(0 0% 0 0)';
      return;
    }
    const progress = (elapsed - plan.start) / (plan.end - plan.start);
    letter.style.opacity = '1';
    letter.style.clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
  });
}

function showAllLetters(letters: HTMLSpanElement[]) {
  for (const letter of letters) {
    letter.style.opacity = '1';
    letter.style.clipPath = 'inset(0 0% 0 0)';
  }
}

function setWordVisibility(words: HTMLSpanElement[], elapsed: number) {
  mantraTimings.forEach((timing, wordIndex) => {
    const word = words[wordIndex];
    if (!word) return;
    const start = wordRevealStart(timing);
    const end = start + wordRevealDuration(wordIndex, timing);
    if (elapsed < start) {
      word.style.opacity = '0';
      word.style.clipPath = 'inset(0 100% 0 0)';
      return;
    }
    if (elapsed >= end) {
      word.style.opacity = '1';
      word.style.clipPath = 'inset(0 0% 0 0)';
      return;
    }
    const progress = (elapsed - start) / (end - start);
    word.style.opacity = '1';
    word.style.clipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
  });
}

function showAllWords(words: HTMLSpanElement[]) {
  for (const word of words) {
    word.style.opacity = '1';
    word.style.clipPath = 'inset(0 0% 0 0)';
  }
}

function hideAllWords(words: HTMLSpanElement[]) {
  for (const word of words) {
    word.style.opacity = '0';
    word.style.clipPath = 'inset(0 100% 0 0)';
  }
}

type MantraWritingProps = {
  active: boolean;
  muted: boolean;
  /** Fired synchronously from Ganesha reveal onComplete — avoids React render delay. */
  playTriggerRef?: MutableRefObject<(() => void) | null>;
  onStart?: () => void;
  onComplete?: () => void;
};

/** Reveals each Sanskrit word in sync with the mantra recording. */
export default function MantraWriting({
  active,
  muted,
  playTriggerRef,
  onStart,
  onComplete,
}: MantraWritingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLSpanElement>(null);
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const letterRefs = useRef<HTMLSpanElement[]>([]);
  const hasPlayedRef = useRef(false);
  const mantraAudioRef = useRef<HTMLAudioElement | null>(null);
  const writingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [iosWordInk] = useState(
    () => typeof window !== 'undefined' && isIOSDevice(),
  );
  const mutedRef = useRef(muted);
  const onStartRef = useRef(onStart);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const playImplRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    setMantraMuted(muted);
    if (writingAudioRef.current) writingAudioRef.current.volume = 0;
  }, [muted]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const root = rootRef.current;
    const pen = penRef.current;
    if (
      !root ||
      !pen ||
      wordRefs.current.length !== mantraTimings.length ||
      (!iosWordInk &&
        letterRefs.current.length !== mantraLetterPlan.length)
    ) {
      return undefined;
    }

    configureGsapPlatform();

    const linearWebKit = prefersLinearWebKitMotion();
    const revealInk = (elapsed: number) => {
      if (iosWordInk) setWordVisibility(wordRefs.current, elapsed);
      else setLetterVisibility(letterRefs.current, elapsed);
    };
    const showAllInk = () => {
      if (iosWordInk) showAllWords(wordRefs.current);
      else showAllLetters(letterRefs.current);
    };
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const duration = mantraTimelineDuration();
    const syncIntervalMs = 40;
    let frame: number | undefined;
    let safetyTimer: number | undefined;
    let lastSync = 0;
    let writingClockStartedAt = 0;

    const startWritingClock = () => {
      if (writingClockStartedAt > 0) return;
      writingClockStartedAt = performance.now();
    };

    const finish = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      showAllInk();
      finishMantraPlaybackSession();
      vivahTrace('mantra-finish', { action: 'on-complete' });
      onCompleteRef.current?.();
    };

    const scheduleCompletion = () => {
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        showAllInk();
        finish();
      }, MANTRA_COMPLETE_PAUSE_MS);
    };

    const scheduleSafetyTimeout = (audio?: HTMLAudioElement) => {
      if (safetyTimer) window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        showAllInk();
        finish();
      }, mantraSafetyTimeoutMs(audio));
    };

    const timeline = gsap.timeline({ paused: true });
    gsap.set(root, { autoAlpha: 0 });
    gsap.set(pen, { autoAlpha: 0 });

    if (iosWordInk) {
      hideAllWords(wordRefs.current);
    }

    if (!linearWebKit && reducedMotion) {
      if (iosWordInk) showAllWords(wordRefs.current);
      else gsap.set(letterRefs.current, { opacity: 1, clipPath: 'inset(0 0% 0 0)' });
      timeline.set(root, { autoAlpha: 1 });
      timeline.to({}, { duration: mantraTimelineDuration() });
    } else if (!linearWebKit) {
      gsap.set(letterRefs.current, { clipPath: 'inset(0 100% 0 0)' });
      gsap.set(pen, { scale: 0.72 });
      timeline.set(root, { autoAlpha: 1 });
      const letterMetrics = mantraLetterPlan.map((_, index) => {
        const el = letterRefs.current[index];
        return {
          startX: el.offsetLeft,
          baseline: el.offsetTop + el.offsetHeight * 0.66,
          width: el.offsetWidth,
        };
      });
      let previousWordIndex = -1;
      mantraLetterPlan.forEach((plan, index) => {
        const letter = letterRefs.current[index];
        const word = wordRefs.current[plan.wordIndex];
        const { startX, baseline, width } = letterMetrics[index];
        const letterDuration = plan.end - plan.start;
        const isWordStart = plan.wordIndex !== previousWordIndex;
        const nextPlan = mantraLetterPlan[index + 1];
        const isWordEnd = !nextPlan || nextPlan.wordIndex !== plan.wordIndex;
        previousWordIndex = plan.wordIndex;

        if (isWordStart) {
          timeline.set(
            pen,
            { x: startX, y: baseline, autoAlpha: 1, scale: 0.72 },
            plan.start,
          );
          timeline.to(pen, { scale: 1, duration: 0.1, ease: 'sine.out' }, plan.start);
        } else {
          timeline.set(pen, { x: startX, y: baseline, autoAlpha: 1 }, plan.start);
        }

        timeline
          .to(
            letter,
            {
              clipPath: 'inset(0 0% 0 0)',
              duration: letterDuration,
              ease: 'none',
            },
            plan.start,
          )
          .to(
            pen,
            { x: startX + width, duration: letterDuration, ease: 'none' },
            plan.start,
          );

        if (isWordEnd) {
          timeline.to(
            word,
            {
              filter: 'brightness(1.18)',
              duration: 0.12,
              yoyo: true,
              repeat: 1,
              ease: 'sine.out',
            },
            plan.end,
          );
          timeline.to(
            pen,
            { autoAlpha: 0, scale: 0.76, duration: 0.14, ease: 'sine.out' },
            plan.end + 0.03,
          );
        }
      });
    }

    let mantraAudio: HTMLAudioElement | undefined;
    let writingAudio: HTMLAudioElement | undefined;
    let playbackStarted = false;
    let usingWebAudio = false;

    const getWritingElapsed = () =>
      getAudioElapsedSeconds(usingWebAudio, mantraAudio, writingClockStartedAt);

    const snapTimelineToComplete = () => {
      timeline.pause().time(duration, false);
      showAllInk();
    };

    const lastWordEnd = mantraTimings.at(-1)?.end ?? duration;

    const handleAudioEnded = () => {
      if (hasCompletedRef.current) return;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      vivahTrace('audio-ended', { track: 'mantra' });

      showAllInk();
      if (!linearWebKit) {
        snapTimelineToComplete();
      }
      scheduleCompletion();
    };

    const startLinearSyncedReveal = () => {
      startWritingClock();
      onStartRef.current?.();

      const tick = () => {
        if (hasCompletedRef.current) return;
        const elapsed = getWritingElapsed();
        revealInk(elapsed);
        const audioDuration =
          getMantraAudioDuration() ||
          (mantraAudio &&
          Number.isFinite(mantraAudio.duration) &&
          mantraAudio.duration > 0
            ? mantraAudio.duration
            : 0);
        if (
          (audioDuration > 0 && elapsed >= audioDuration - 0.05) ||
          elapsed >= lastWordEnd
        ) {
          scheduleCompletion();
          return;
        }
        frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
    };

    const syncWritingProgress = (now: number) => {
      if (hasCompletedRef.current) return;
      if (now - lastSync >= syncIntervalMs) {
        lastSync = now;
        const currentTime = Math.min(getWritingElapsed(), duration);
        timeline.pause().time(currentTime, false);
        if (writingAudio) {
          const writingNow = mantraTimings.some(
            ({ start, end }) => currentTime >= start && currentTime <= end,
          );
          writingAudio.volume = writingNow && !mutedRef.current ? 0.1 : 0;
        }
        if (currentTime >= lastWordEnd) {
          scheduleCompletion();
          return;
        }
      }
      frame = window.requestAnimationFrame(syncWritingProgress);
    };

    const startWallClockReveal = () => {
      startWritingClock();
      onStartRef.current?.();

      const tick = () => {
        if (hasCompletedRef.current) return;
        const elapsed = getWritingElapsed();
        revealInk(elapsed);
        if (elapsed >= duration) {
          scheduleCompletion();
          return;
        }
        frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
    };

    const startSynchronizedPlayback = () => {
      if (!mantraAudio || playbackStarted) return;
      playbackStarted = true;
      registerMantraPlaybackStart();
      vivahTrace('mantra-start', { action: 'writing-sequence' });
      mantraAudio.pause();
      mantraAudio.currentTime = 0;
      mantraAudio.volume = mutedRef.current ? 0 : 0.72;
      timeline.pause(0);

      const onPlaying = () => {
        vivahTrace('audio-playing', {
          track: 'mantra',
          duration: Number.isFinite(mantraAudio!.duration)
            ? Number(mantraAudio!.duration.toFixed(2))
            : null,
        });
        onStartRef.current?.();
        void writingAudio?.play();
        startWritingClock();
        lastSync = 0;
        syncWritingProgress(performance.now());
        scheduleSafetyTimeout(mantraAudio);
      };

      const playWithRetry = (attempt = 0) => {
        void mantraAudio!
          .play()
          .then(onPlaying)
          .catch(() => {
            playbackStarted = false;
            if (attempt < 2) {
              window.setTimeout(() => playWithRetry(attempt + 1), attempt === 0 ? 0 : 120);
              return;
            }
            timeline.play(0);
            onStartRef.current?.();
            timeline.eventCallback('onComplete', () => scheduleCompletion());
          });
      };

      playWithRetry();
    };

    const startLinearWebKitPlayback = () => {
      if (playbackStarted) return;

      void ensureMantraAudioReady().then(() => {
        if (playbackStarted) return;
        playbackStarted = true;
        registerMantraPlaybackStart();
        vivahTrace('mantra-start', { action: 'writing-sequence' });

        gsap.set(root, { autoAlpha: 1 });
        for (const letter of letterRefs.current) {
          letter.style.opacity = '0';
          letter.style.clipPath = 'inset(0 100% 0 0)';
        }

        const volume = mutedRef.current ? 0 : 0.72;
        usingWebAudio = playMantraCue(volume, handleAudioEnded, () => {
          scheduleSafetyTimeout();
          startLinearSyncedReveal();
        });

        if (usingWebAudio) {
          return;
        }

        mantraAudio = acquireMantraAudio() ?? undefined;
        if (mantraAudio) {
          mantraAudioRef.current = mantraAudio;
          mantraAudio.pause();
          mantraAudio.currentTime = 0;
          mantraAudio.muted = false;
          mantraAudio.volume = volume;
          mantraAudio.addEventListener('ended', handleAudioEnded, { once: true });

          const onPlaying = () => {
            vivahTrace('audio-playing', { track: 'mantra', engine: 'linear-html' });
            scheduleSafetyTimeout(mantraAudio);
            startLinearSyncedReveal();
          };

          mantraAudio.addEventListener('playing', onPlaying, { once: true });
          const keepWritingOnPause = () => startWritingClock();
          mantraAudio.addEventListener('pause', keepWritingOnPause);
          void mantraAudio.play().catch(() => {
            vivahTrace('audio-play-failed', { track: 'mantra', engine: 'linear' });
            startWallClockReveal();
            scheduleSafetyTimeout();
          });
        } else {
          startWallClockReveal();
          scheduleSafetyTimeout();
        }
      });
    };

    const play = () => {
      if (hasPlayedRef.current) return;
      hasPlayedRef.current = true;
      startWritingClock();

      if (linearWebKit) {
        startLinearWebKitPlayback();
        return;
      }

      if (reducedMotion) {
        vivahTrace('mantra-start', { action: 'writing-sequence' });
        mantraAudio = acquireMantraAudio() ?? undefined;
        if (mantraAudio) {
          mantraAudioRef.current = mantraAudio;
          mantraAudio.pause();
          mantraAudio.currentTime = 0;
          mantraAudio.volume = mutedRef.current ? 0 : 0.72;
          onStartRef.current?.();
          void mantraAudio
            .play()
            .then(() => {
              registerMantraPlaybackStart();
              scheduleSafetyTimeout(mantraAudio);
            })
            .catch(() => {
              timeline.play(0);
              timeline.eventCallback('onComplete', () => scheduleCompletion());
            });
          mantraAudio.addEventListener('ended', handleAudioEnded, { once: true });
        } else {
          timeline.play(0);
          onStartRef.current?.();
          timeline.eventCallback('onComplete', () => scheduleCompletion());
        }
        return;
      }

      mantraAudio = acquireMantraAudio() ?? undefined;
      if (mantraAudio) {
        mantraAudioRef.current = mantraAudio;
        if (CALLIGRAPHY_SOUND_SRC) {
          writingAudio = new Audio(CALLIGRAPHY_SOUND_SRC);
          writingAudio.preload = 'auto';
          writingAudio.loop = true;
          writingAudio.volume = 0;
          writingAudioRef.current = writingAudio;
        }
        if (mantraAudio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          startSynchronizedPlayback();
        } else {
          const onReady = () => {
            startSynchronizedPlayback();
          };
          mantraAudio.addEventListener('canplay', onReady, { once: true });
          mantraAudio.addEventListener(
            'error',
            () => {
              timeline.play(0);
              onStartRef.current?.();
              timeline.eventCallback('onComplete', () => scheduleCompletion());
            },
            { once: true },
          );
          window.setTimeout(() => {
            if (!playbackStarted && mantraAudio?.paused) {
              onReady();
            }
          }, 1800);
        }
        mantraAudio.addEventListener('ended', handleAudioEnded, { once: true });
        mantraAudio.addEventListener('pause', startWritingClock);
        mantraAudio.addEventListener(
          'loadedmetadata',
          () => {
            if (playbackStarted) scheduleSafetyTimeout(mantraAudio);
          },
          { once: true },
        );
      } else {
        vivahTrace('mantra-start', { action: 'writing-sequence' });
        timeline.play(0);
        onStartRef.current?.();
        timeline.eventCallback('onComplete', () => scheduleCompletion());
      }
    };

    playImplRef.current = play;
    if (playTriggerRef) playTriggerRef.current = play;

    return () => {
      playImplRef.current = null;
      if (playTriggerRef) playTriggerRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
      if (safetyTimer) window.clearTimeout(safetyTimer);
      stopMantraPlayback();
      writingAudio?.pause();
      mantraAudioRef.current = null;
      writingAudioRef.current = null;
      if (iosWordInk) {
        for (const word of wordRefs.current) {
          word.style.opacity = '';
          word.style.clipPath = '';
        }
      } else {
        for (const letter of letterRefs.current) {
          letter.style.opacity = '';
          letter.style.clipPath = '';
        }
      }
      timeline.kill();
    };
  }, [iosWordInk, playTriggerRef]);

  useEffect(() => {
    if (!active || hasPlayedRef.current) return;
    playImplRef.current?.();
  }, [active]);

  return (
    <div
      ref={rootRef}
      className={styles.mantra}
      suppressHydrationWarning
      aria-label="वक्रतुण्ड महाकाय सूर्यकोटि समप्रभः। निर्विघ्नं कुरु मे देव शुभकार्येषु सर्वदा॥"
    >
      {groups.map((line, lineIndex) => (
        <p key={lineIndex} className={styles.line} lang="sa">
          {line.map((timing, wordIndexInLine) => {
            const index =
              lineIndex === 0 ? wordIndexInLine : wordIndexInLine + groups[0].length;
            return (
              <span
                key={timing.word}
                ref={(element) => {
                  if (element) wordRefs.current[index] = element;
                }}
                className={`${styles.word} ${iosWordInk ? styles.wordInk : ''}`}
              >
                {iosWordInk
                  ? timing.word
                  : mantraWordGraphemes[index].map((grapheme, letterIndex) => (
                      <span
                        key={letterIndex}
                        ref={(element) => {
                          if (element) {
                            letterRefs.current[
                              letterPlanBaseByWord[index] + letterIndex
                            ] = element;
                          }
                        }}
                        className={styles.letter}
                      >
                        {grapheme}
                      </span>
                    ))}
              </span>
            );
          })}
        </p>
      ))}
      <span ref={penRef} className={styles.pen} aria-hidden="true" />
    </div>
  );
}
