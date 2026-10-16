import { prefersMobileWebKitMotion } from "@/lib/motion";
import { vivahTrace } from "@/lib/vivahTrace";

export const SHANK_AUDIO_SRC = "/assets/audio/shankh-sound.mp3";
export const MANTRA_AUDIO_SRC = "/assets/audio/ganesha-mantra.mp3";
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
let shankHtmlFallback: HTMLAudioElement | null = null;

let mantraAudio: HTMLAudioElement | null = null;
let mantraBuffer: AudioBuffer | null = null;
let mantraLoadPromise: Promise<void> | null = null;
let mantraSource: AudioBufferSourceNode | null = null;
let mantraGain: GainNode | null = null;
let mantraPlaybackStartTime = 0;
let mantraPerformanceStart = 0;
let mantraPlaybackActive = false;

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

  if (mantraAudio && !mantraPlaybackActive) primeHtmlAudio(mantraAudio);
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
}

/** Elapsed mantra seconds from Web Audio playback (0 if not playing). */
export function getMantraPlaybackElapsed(): number {
  if (!mantraSource) return 0;
  if (
    shankContext &&
    shankContext.state === "running" &&
    mantraPlaybackStartTime > 0
  ) {
    return Math.max(0, shankContext.currentTime - mantraPlaybackStartTime);
  }
  if (mantraPerformanceStart > 0) {
    return (performance.now() - mantraPerformanceStart) / 1000;
  }
  return 0;
}

export function getMantraAudioDuration(): number {
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

  const source = shankContext.createBufferSource();
  source.buffer = mantraBuffer;
  const gain = shankContext.createGain();
  gain.gain.value = vol;
  source.connect(gain);
  gain.connect(shankContext.destination);
  mantraSource = source;
  mantraGain = gain;
  source.onended = () => {
    mantraSource = null;
    mantraGain = null;
    resetMantraPlaybackClock();
    vivahTrace("audio-ended", { track: "mantra", engine: "webaudio" });
    onEnded?.();
  };

  const begin = () => {
    if (!shankContext || !mantraSource) return;
    mantraPlaybackStartTime = shankContext.currentTime;
    mantraPerformanceStart = performance.now();
    mantraSource.start(0);
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
        if (!mantraAudio) return;
        mantraAudio.pause();
        mantraAudio.currentTime = 0;
        mantraAudio.volume = vol;
        mantraAudio.addEventListener("ended", () => onEnded?.(), { once: true });
        void mantraAudio
          .play()
          .then(() => {
            registerMantraPlaybackStart();
            vivahTrace("audio-playing", { track: "mantra", engine: "html-fallback" });
            onStarted?.();
          })
          .catch(() => {
            vivahTrace("audio-play-failed", { track: "mantra", engine: "html-fallback" });
          });
      });
  } else {
    begin();
  }

  return true;
}

export function stopMantraPlayback() {
  stopMantraWebAudio();
  mantraPlaybackActive = false;
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
}

/** Stop shank from Web Audio or HTML fallback (e.g. site mute during envelope open). */
export function stopShankPlayback() {
  stopShankWebAudio();
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
