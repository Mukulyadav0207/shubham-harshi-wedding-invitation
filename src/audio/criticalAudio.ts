import { prefersMobileWebKitMotion } from "@/lib/motion";
import { vivahTrace } from "@/lib/vivahTrace";
import {
  MANTRA_PLAYBACK_TRIM_END_SEC,
  MANTRA_PLAYBACK_TRIM_START_SEC,
} from "@/components/sections/ganesha/mantraSync";

export { MANTRA_PLAYBACK_TRIM_END_SEC, MANTRA_PLAYBACK_TRIM_START_SEC };

export const SHANK_AUDIO_SRC = "/assets/audio/shankh-sound.mp3";
export const MANTRA_AUDIO_SRC = "/assets/audio/navkar-mantra.mp3";
export const POP_AUDIO_SRC = "/assets/audio/pop.mp3";
export const APPLAUSE_AUDIO_SRC = "/assets/audio/applause.mp3";

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let shankContext: AudioContext | null = null;
let shankBuffer: AudioBuffer | null = null;
let shankLoadPromise: Promise<void> | null = null;
let shankSource: AudioBufferSourceNode | null = null;
let shankGain: GainNode | null = null;
let shankHtmlFallback: HTMLAudioElement | null = null;
let shankHtmlFadeTimer: number | null = null;

let mantraAudio: HTMLAudioElement | null = null;
let mantraBuffer: AudioBuffer | null = null;
let mantraLoadPromise: Promise<void> | null = null;
let mantraSource: AudioBufferSourceNode | null = null;
let mantraGain: GainNode | null = null;
let mantraPlaybackStartTime = 0;
let mantraPerformanceStart = 0;
let mantraPlaybackEndedElapsed = 0;
let mantraScheduledPlayDuration = 0;
let mantraPlaybackActive = false;
let mantraHtmlPrimePromise: Promise<void> | null = null;
let mantraHtmlFadeTimer: number | null = null;

const MANTRA_FADE_IN_SEC = 0.35;
const SHANK_MANTRA_CROSSFADE_SEC = 1.35;

let popAudio: HTMLAudioElement | null = null;
let applauseAudio: HTMLAudioElement | null = null;

export function applyInlineAudioAttrs(audio: HTMLAudioElement) {
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
}

export function createBufferedAudio(src: string, loop = false) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = loop;
  applyInlineAudioAttrs(audio);
  audio.load();
  return audio;
}

function mantraHtmlSeekTarget() {
  return MANTRA_PLAYBACK_TRIM_START_SEC;
}

function mantraFileDurationSeconds(): number {
  if (mantraBuffer && Number.isFinite(mantraBuffer.duration)) {
    return mantraBuffer.duration;
  }
  if (
    mantraAudio &&
    Number.isFinite(mantraAudio.duration) &&
    mantraAudio.duration > 0
  ) {
    return mantraAudio.duration;
  }
  return 0;
}

/** Last sample index to play (file time). */
export function getMantraPlaybackTrimEndSec(fileDuration = mantraFileDurationSeconds()) {
  const start = MANTRA_PLAYBACK_TRIM_START_SEC;
  let end = MANTRA_PLAYBACK_TRIM_END_SEC;
  if (!Number.isFinite(end) || end <= start) {
    end = fileDuration > 0 ? fileDuration : start + 54;
  }
  if (fileDuration > 0) end = Math.min(end, fileDuration);
  return end;
}

export function getMantraPlaybackSpanSec(fileDuration = mantraFileDurationSeconds()) {
  return Math.max(
    0,
    getMantraPlaybackTrimEndSec(fileDuration) - MANTRA_PLAYBACK_TRIM_START_SEC,
  );
}

/** Wait until HTMLAudio is paused at the mantra trim point (in-sync start). */
export function seekMantraHtmlToStart(audio: HTMLAudioElement): Promise<void> {
  const target = mantraHtmlSeekTarget();
  audio.pause();
  if (Math.abs(audio.currentTime - target) < 0.02 && !audio.seeking) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => resolve();
    try {
      audio.currentTime = target;
    } catch {
      finish();
      return;
    }
    if (!audio.seeking) {
      finish();
      return;
    }
    audio.addEventListener("seeked", finish, { once: true });
    window.setTimeout(finish, 120);
  });
}

/** Elapsed seconds for lyric sync (0 = first णमो line at trim point). */
export function getMantraHtmlPlaybackElapsed(audio: HTMLAudioElement): number {
  const raw = Math.max(0, audio.currentTime - MANTRA_PLAYBACK_TRIM_START_SEC);
  const span = getMantraPlaybackSpanSec(audio.duration);
  return span > 0 ? Math.min(raw, span) : raw;
}

/**
 * Unlock mantra HTML during envelope tap without leaving the element mid-track.
 * Must run synchronously in the gesture handler (before await).
 */
function primeMantraHtmlUnlock(audio: HTMLAudioElement) {
  if (mantraPlaybackActive) return;
  applyInlineAudioAttrs(audio);
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    // ignore — will seek again before real playback
  }
  const previousMuted = audio.muted;
  const previousVolume = audio.volume;
  audio.muted = true;
  audio.volume = 0;
  const playPromise = audio.play();
  if (!playPromise) {
    audio.muted = previousMuted;
    audio.volume = previousVolume;
    return;
  }
  mantraHtmlPrimePromise = playPromise
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    })
    .catch(() => {
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    })
    .finally(() => {
      mantraHtmlPrimePromise = null;
    });
}

/** iOS Safari requires a play() during the user gesture before later programmatic playback works. */
export function primeHtmlAudio(audio: HTMLAudioElement) {
  applyInlineAudioAttrs(audio);
  const previousMuted = audio.muted;
  audio.muted = true;
  const playPromise = audio.play();
  if (!playPromise) {
    audio.muted = previousMuted;
    return;
  }
  void playPromise
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = previousMuted;
    })
    .catch(() => {
      audio.muted = previousMuted;
    });
}

function primeWebAudioContext(context: AudioContext) {
  if (context.state === "suspended") {
    void context.resume();
  }
  const buffer = context.createBuffer(1, 1, 22050);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
}

async function ensureMantraBuffer() {
  if (mantraBuffer) return;
  if (!mantraLoadPromise) {
    mantraLoadPromise = (async () => {
      await ensureShankBuffer();
      if (!shankContext) return;
      try {
        const response = await fetch(MANTRA_AUDIO_SRC);
        mantraBuffer = await shankContext.decodeAudioData(
          await response.arrayBuffer(),
        );
        vivahTrace("audio-preload", { track: "mantra", engine: "webaudio" });
      } catch {
        vivahTrace("audio-preload-failed", { track: "mantra", engine: "webaudio" });
      }
    })();
  }
  await mantraLoadPromise;
}

function stopMantraWebAudio() {
  try {
    mantraSource?.stop();
  } catch {
    // already stopped
  }
  mantraSource = null;
  mantraGain = null;
  resetMantraPlaybackClock();
}

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  const scoped = window as WebAudioWindow;
  return scoped.AudioContext ?? scoped.webkitAudioContext ?? null;
}

async function ensureShankBuffer() {
  if (shankBuffer) return;
  if (!shankLoadPromise) {
    shankLoadPromise = (async () => {
      const AudioContextClass = getAudioContextClass();
      if (!AudioContextClass) {
        vivahTrace("audio-preload-failed", {
          track: "shank",
          reason: "no-webaudio",
        });
        return;
      }
      try {
        if (!shankContext) shankContext = new AudioContextClass();
        const response = await fetch(SHANK_AUDIO_SRC);
        shankBuffer = await shankContext.decodeAudioData(
          await response.arrayBuffer(),
        );
        vivahTrace("audio-preload", { track: "shank", engine: "webaudio" });
      } catch {
        vivahTrace("audio-preload-failed", { track: "shank" });
      }
    })();
  }
  await shankLoadPromise;
}

function ensureShankHtmlFallback() {
  if (!shankHtmlFallback) {
    shankHtmlFallback = createBufferedAudio(SHANK_AUDIO_SRC);
  }
  return shankHtmlFallback;
}

export function warmSoundEffects() {
  if (typeof window === "undefined") return;
  if (!popAudio) popAudio = createBufferedAudio(POP_AUDIO_SRC);
  if (!applauseAudio) applauseAudio = createBufferedAudio(APPLAUSE_AUDIO_SRC);
}

/** Resolve when shank is decoded and ready for instant tap playback. */
export function whenShankReady() {
  warmCriticalAudio();
  return ensureShankBuffer();
}

/** Begin fetching/decoding shank + mantra as early as possible. */
export function warmCriticalAudio() {
  if (typeof window === "undefined") return;
  void ensureShankBuffer();
  void ensureMantraBuffer();
  if (!mantraAudio) {
    mantraAudio = createBufferedAudio(MANTRA_AUDIO_SRC);
    vivahTrace("audio-preload", { track: "mantra" });
  }
  warmSoundEffects();
}

/**
 * Unlock iOS/WebKit audio during the user gesture.
 * Must run synchronously in the click handler before any await/setTimeout.
 */
export function unlockAudioOnUserGesture() {
  if (typeof window === "undefined") return;
  warmCriticalAudio();

  const AudioContextClass = getAudioContextClass();
  if (AudioContextClass && !shankContext) {
    shankContext = new AudioContextClass();
  }
  if (shankContext) {
    primeWebAudioContext(shankContext);
    if (shankContext.state === "suspended") {
      void shankContext.resume();
    }
  }

  if (mantraAudio && !mantraPlaybackActive) primeMantraHtmlUnlock(mantraAudio);
  primeHtmlAudio(ensureShankHtmlFallback());
  if (popAudio) primeHtmlAudio(popAudio);
  if (applauseAudio) primeHtmlAudio(applauseAudio);

  vivahTrace("audio-unlock", { engine: "gesture" });
}

export function registerMantraPlaybackStart() {
  mantraPlaybackActive = true;
}

/** Resume a suspended Web Audio context during a user gesture (no HTML priming). */
export function resumeAudioContextOnUserGesture() {
  if (shankContext?.state === "suspended") {
    void shankContext.resume();
  }
}

/** Decode mantra during Ganesha reveal so play() is instant when writing begins. */
export function ensureMantraAudioReady(): Promise<void> {
  warmCriticalAudio();
  const htmlReady = new Promise<void>((resolve) => {
    const audio = mantraAudio;
    if (!audio || audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      resolve();
      return;
    }
    const finish = () => resolve();
    audio.addEventListener("canplaythrough", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.load();
    window.setTimeout(finish, 2500);
  });
  return Promise.all([ensureMantraBuffer(), htmlReady]).then(() => undefined);
}

function resetMantraPlaybackClock() {
  mantraPlaybackStartTime = 0;
  mantraPerformanceStart = 0;
  mantraPlaybackEndedElapsed = 0;
  mantraScheduledPlayDuration = 0;
}

/** Elapsed mantra seconds from Web Audio playback (trim-aligned timeline). */
export function getMantraPlaybackElapsed(): number {
  if (
    mantraSource &&
    shankContext &&
    mantraPlaybackStartTime > 0
  ) {
    const live = Math.max(0, shankContext.currentTime - mantraPlaybackStartTime);
    mantraPlaybackEndedElapsed = live;
    return live;
  }
  if (mantraPlaybackEndedElapsed > 0) {
    return mantraPlaybackEndedElapsed;
  }
  if (mantraPerformanceStart > 0) {
    return (performance.now() - mantraPerformanceStart) / 1000;
  }
  return 0;
}

/** Single lyric-sync clock for mantra writing (Web Audio + HTML). */
export function getMantraSyncElapsed(): number {
  const span = getMantraPlaybackSpanSec();
  let elapsed = 0;

  if (mantraSource && shankContext && mantraPlaybackStartTime > 0) {
    elapsed = Math.max(0, shankContext.currentTime - mantraPlaybackStartTime);
  } else if (mantraPlaybackActive && mantraAudio) {
    elapsed = getMantraHtmlPlaybackElapsed(mantraAudio);
  } else if (mantraPlaybackEndedElapsed > 0) {
    elapsed = mantraPlaybackEndedElapsed;
  }

  if (span > 0) return Math.min(elapsed, span);
  return elapsed;
}

export function getMantraAudioDuration(): number {
  let full = 0;
  if (mantraBuffer && Number.isFinite(mantraBuffer.duration)) {
    full = mantraBuffer.duration;
  } else if (
    mantraAudio &&
    Number.isFinite(mantraAudio.duration) &&
    mantraAudio.duration > 0
  ) {
    full = mantraAudio.duration;
  }
  if (full <= 0) return getMantraPlaybackSpanSec(0);
  return getMantraPlaybackSpanSec(full);
}

/**
 * Instant mantra on mobile/WebKit via decoded buffer; returns false to use HTML fallback.
 * onStarted fires when samples are actually scheduled (after AudioContext resume).
 */
export function playMantraCue(
  volume: number,
  onEnded?: () => void,
  onStarted?: () => void,
): boolean {
  warmCriticalAudio();
  const vol = Math.max(0, Math.min(1, volume));
  // Primed HTMLAudio is far more reliable than delayed Web Audio on iOS/WebKit.
  if (prefersMobileWebKitMotion()) {
    return false;
  }

  if (!shankContext || !mantraBuffer) {
    return false;
  }

  stopMantraWebAudio();
  resetMantraPlaybackClock();
  crossfadeShankIntoMantra(SHANK_MANTRA_CROSSFADE_SEC);

  const source = shankContext.createBufferSource();
  source.buffer = mantraBuffer;
  const gain = shankContext.createGain();
  const now = shankContext.currentTime;
  const fadeIn = Math.max(MANTRA_FADE_IN_SEC, SHANK_MANTRA_CROSSFADE_SEC);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + fadeIn);
  source.connect(gain);
  gain.connect(shankContext.destination);
  mantraSource = source;
  mantraGain = gain;
  source.onended = () => {
    if (mantraScheduledPlayDuration > 0) {
      mantraPlaybackEndedElapsed = mantraScheduledPlayDuration;
    }
    mantraSource = null;
    mantraGain = null;
    mantraPlaybackStartTime = 0;
    mantraPerformanceStart = 0;
    vivahTrace("audio-ended", { track: "mantra", engine: "webaudio" });
    onEnded?.();
  };

  const begin = () => {
    if (!shankContext || !mantraSource) return;
    mantraPlaybackStartTime = shankContext.currentTime;
    mantraPerformanceStart = performance.now();
    const offset = MANTRA_PLAYBACK_TRIM_START_SEC;
    const fileDuration = mantraBuffer?.duration ?? 0;
    const playEnd = getMantraPlaybackTrimEndSec(fileDuration);
    mantraScheduledPlayDuration = Math.max(0, playEnd - offset);
    if (mantraScheduledPlayDuration > 0) {
      mantraSource.start(0, offset, mantraScheduledPlayDuration);
    } else {
      mantraSource.start(0, offset);
    }
    registerMantraPlaybackStart();
    vivahTrace("audio-playing", { track: "mantra", engine: "webaudio" });
    onStarted?.();
  };

  if (shankContext.state === "suspended") {
    void shankContext
      .resume()
      .then(begin)
      .catch(() => {
        stopMantraWebAudio();
        vivahTrace("audio-play-failed", { track: "mantra", engine: "webaudio" });
        void playMantraHtml(vol, onEnded, onStarted);
      });
  } else {
    begin();
  }

  return true;
}

/**
 * HTML mantra from sample 0 with seek confirmation and a short volume fade-in.
 * Used on WebKit mobile where Web Audio mantra is skipped.
 */
export async function playMantraHtml(
  volume: number,
  onEnded?: () => void,
  onStarted?: () => void,
): Promise<boolean> {
  warmCriticalAudio();
  const audio = acquireMantraAudio();
  if (!audio) return false;

  const vol = Math.max(0, Math.min(1, volume));
  stopMantraWebAudio();
  mantraPlaybackActive = false;

  if (mantraHtmlPrimePromise) {
    try {
      await mantraHtmlPrimePromise;
    } catch {
      // ignore
    }
  }

  audio.removeAttribute("loop");
  audio.loop = false;
  audio.muted = false;
  await seekMantraHtmlToStart(audio);
  crossfadeShankIntoMantra(SHANK_MANTRA_CROSSFADE_SEC);

  const trimEnd = getMantraPlaybackTrimEndSec(audio.duration);
  const useTrimStop =
    Number.isFinite(audio.duration) &&
    audio.duration > 0 &&
    trimEnd < audio.duration - 0.08;

  let endedFired = false;
  const fireEnded = () => {
    if (endedFired) return;
    endedFired = true;
    audio.removeEventListener("timeupdate", onTimeUpdate);
    onEnded?.();
  };

  const onTimeUpdate = () => {
    if (audio.currentTime >= trimEnd - 0.04) {
      audio.pause();
      try {
        audio.currentTime = trimEnd;
      } catch {
        // ignore
      }
      fireEnded();
    }
  };

  if (onEnded) {
    if (useTrimStop) {
      audio.addEventListener("timeupdate", onTimeUpdate);
    } else {
      audio.addEventListener("ended", () => fireEnded(), { once: true });
    }
  }

  audio.volume = 0;
  let playbackNotified = false;
  const notifyPlaybackStarted = () => {
    if (playbackNotified) return;
    playbackNotified = true;
    registerMantraPlaybackStart();
    vivahTrace("audio-playing", { track: "mantra", engine: "html" });
    onStarted?.();
  };
  audio.addEventListener("playing", notifyPlaybackStarted, { once: true });

  try {
    await audio.play();
  } catch {
    audio.removeEventListener("playing", notifyPlaybackStarted);
    vivahTrace("audio-play-failed", { track: "mantra", engine: "html" });
    return false;
  }
  if (!playbackNotified) notifyPlaybackStarted();

  const htmlFadeSec = Math.max(MANTRA_FADE_IN_SEC, SHANK_MANTRA_CROSSFADE_SEC);
  const fadeSteps = 14;
  const stepMs = (htmlFadeSec * 1000) / fadeSteps;
  let step = 0;
  if (mantraHtmlFadeTimer) window.clearInterval(mantraHtmlFadeTimer);
  mantraHtmlFadeTimer = window.setInterval(() => {
    step += 1;
    const t = step / fadeSteps;
    audio.volume = vol * Math.min(1, t);
    if (step >= fadeSteps) {
      if (mantraHtmlFadeTimer) window.clearInterval(mantraHtmlFadeTimer);
      mantraHtmlFadeTimer = null;
      audio.volume = vol;
    }
  }, stepMs);

  return true;
}

export function stopMantraPlayback() {
  stopMantraWebAudio();
  mantraPlaybackActive = false;
  if (mantraHtmlFadeTimer) {
    window.clearInterval(mantraHtmlFadeTimer);
    mantraHtmlFadeTimer = null;
  }
  if (!mantraAudio) return;
  mantraAudio.pause();
  mantraAudio.currentTime = 0;
}

export function finishMantraPlaybackSession() {
  mantraPlaybackActive = false;
}

export function setMantraPlaybackVolume(volume: number) {
  const vol = Math.max(0, Math.min(1, volume));
  if (mantraGain) mantraGain.gain.value = vol;
  if (mantraAudio) mantraAudio.volume = vol;
}

/** Mute/unmute mantra during the writing sequence (volume only — playback keeps running). */
export function setMantraMuted(muted: boolean) {
  setMantraPlaybackVolume(muted ? 0 : 0.72);
}

function stopShankWebAudio() {
  try {
    shankSource?.stop();
  } catch {
    // already stopped
  }
  shankSource = null;
  shankGain = null;
}

function fadeShankHtmlVolume(targetVolume: number, durationMs: number) {
  const track = shankHtmlFallback;
  if (!track || track.paused) return;
  if (shankHtmlFadeTimer) window.clearInterval(shankHtmlFadeTimer);
  const startVolume = track.volume;
  const steps = Math.max(6, Math.round(durationMs / 40));
  const stepMs = durationMs / steps;
  let step = 0;
  shankHtmlFadeTimer = window.setInterval(() => {
    step += 1;
    const t = step / steps;
    track.volume = startVolume + (targetVolume - startVolume) * t;
    if (step >= steps) {
      if (shankHtmlFadeTimer) window.clearInterval(shankHtmlFadeTimer);
      shankHtmlFadeTimer = null;
      track.volume = targetVolume;
      if (targetVolume <= 0.001) {
        track.pause();
        track.currentTime = 0;
      }
    }
  }, stepMs);
}

/** Overlap shank tail with mantra start so the hand-off feels like one continuous sound. */
export function crossfadeShankIntoMantra(durationSec = SHANK_MANTRA_CROSSFADE_SEC) {
  const duration = Math.max(0.2, durationSec);
  if (shankGain && shankContext) {
    const now = shankContext.currentTime;
    shankGain.gain.cancelScheduledValues(now);
    shankGain.gain.setValueAtTime(shankGain.gain.value, now);
    shankGain.gain.linearRampToValueAtTime(0, now + duration);
    window.setTimeout(() => stopShankWebAudio(), duration * 1000 + 80);
    return;
  }
  fadeShankHtmlVolume(0, duration * 1000);
}

/** Stop shank from Web Audio or HTML fallback (e.g. site mute during envelope open). */
export function stopShankPlayback() {
  stopShankWebAudio();
  if (shankHtmlFadeTimer) {
    window.clearInterval(shankHtmlFadeTimer);
    shankHtmlFadeTimer = null;
  }
  if (!shankHtmlFallback) return;
  shankHtmlFallback.pause();
  shankHtmlFallback.currentTime = 0;
}

function playShankWebAudio(volume: number) {
  if (!shankContext || !shankBuffer) return false;
  stopShankWebAudio();
  if (shankContext.state === "suspended") {
    void shankContext.resume();
  }
  const source = shankContext.createBufferSource();
  source.buffer = shankBuffer;
  const gain = shankContext.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(shankContext.destination);
  shankSource = source;
  shankGain = gain;
  source.onended = () => {
    shankSource = null;
    vivahTrace("audio-ended", { track: "shank", engine: "webaudio" });
  };
  source.start(0);
  vivahTrace("audio-playing", { track: "shank", engine: "webaudio" });
  vivahTrace("audio-audible", { track: "shank", engine: "webaudio", t: 0 });
  return true;
}

function playShankHtmlFallback(volume: number) {
  const track = ensureShankHtmlFallback();
  track.pause();
  track.currentTime = 0;
  track.loop = false;
  track.muted = false;
  track.volume = volume;
  vivahTrace("audio-play", { track: "shank", engine: "html", volume });
  void track
    .play()
    .then(() => vivahTrace("audio-playing", { track: "shank", engine: "html" }))
    .catch(() =>
      vivahTrace("audio-play-failed", { track: "shank", engine: "html" }),
    );
  track.addEventListener(
    "ended",
    () => vivahTrace("audio-ended", { track: "shank", engine: "html" }),
    { once: true },
  );
  return true;
}

/** Instant shank on tap — HTMLAudio on iOS/WebKit mobile; Web Audio elsewhere. */
export function playShankOpeningCue(volume: number) {
  warmCriticalAudio();
  const vol = Math.max(0, Math.min(1, volume));
  vivahTrace("audio-play", { track: "shank", volume: vol });

  if (prefersMobileWebKitMotion()) {
    playShankHtmlFallback(vol);
    void ensureShankBuffer();
    return true;
  }

  if (shankContext?.state === "suspended") {
    void shankContext.resume();
  }

  if (playShankWebAudio(vol)) return true;

  playShankHtmlFallback(vol);
  void ensureShankBuffer();
  return true;
}

export function acquireMantraAudio() {
  warmCriticalAudio();
  if (mantraAudio) {
    mantraAudio.muted = false;
  }
  return mantraAudio;
}

export function acquirePopAudio() {
  warmSoundEffects();
  return popAudio;
}

export function acquireApplauseAudio() {
  warmSoundEffects();
  return applauseAudio;
}
