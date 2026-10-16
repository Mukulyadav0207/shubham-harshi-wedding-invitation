import {
  getInvitationTrackIdNow,
  getInvitationTrackSrc,
  getMsUntilNextInvitationTrackWindow,
  persistManualInvitationTrackId,
  readManualInvitationTrackId,
  resolveInvitationTrackSrc,
  type InvitationTrackId,
} from "./invitationTracks";
import {
  createBufferedAudio,
  playShankOpeningCue,
  primeHtmlAudio,
  warmCriticalAudio,
} from "./criticalAudio";

export const WEDDING_MUSIC_VOLUME = 0.4;
const WEDDING_OPENING_TRACK = "/assets/audio/shankh-sound.mp3";

export type WeddingMusicTrack = "opening" | "invitation";

export type WeddingMusicController = {
  play: () => Promise<boolean>;
  playOpeningCue: () => Promise<boolean>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  fadeIn: (duration?: number) => void;
  fadeOut: (duration?: number) => void;
  setMuted: (muted: boolean) => void;
  setTrack: (track: WeddingMusicTrack) => void;
  setInvitationSource: (
    src: string,
    options?: { manual?: boolean; trackId?: InvitationTrackId },
  ) => void;
  selectInvitationTrack: (trackId: InvitationTrackId, manual?: boolean) => void;
  syncInvitationTrackToClock: () => InvitationTrackId;
  startInvitationTrackRotation: () => void;
  stopInvitationTrackRotation: () => void;
  getInvitationSource: () => string;
  preload: () => void;
  unlockForUserGesture: () => void;
  destroy: () => void;
};

/** Persistent browser controller for the wedding opening and invitation tracks. */
export function createWeddingMusic(
  initialInvitationSource = resolveInvitationTrackSrc(getInvitationTrackIdNow()),
): WeddingMusicController {
  let openingAudio: HTMLAudioElement | undefined;
  let invitationAudio: HTMLAudioElement | undefined;
  let fadeFrame: number | undefined;
  let rotationTimer: number | undefined;
  let resumeAfterVisibilityChange = false;
  let isMuted = false;
  let intendedVolume = WEDDING_MUSIC_VOLUME;
  let activeTrack: WeddingMusicTrack = "opening";
  let invitationSource = initialInvitationSource;

  const cancelFade = () => {
    if (fadeFrame !== undefined) window.cancelAnimationFrame(fadeFrame);
    fadeFrame = undefined;
  };

  const attachPlaybackGuard = (track: HTMLAudioElement) => {
    track.onerror = () => undefined;
  };

  const ensureOpeningAudio = () => {
    if (!openingAudio) {
      openingAudio = createBufferedAudio(WEDDING_OPENING_TRACK, false);
      openingAudio.volume = 0;
      attachPlaybackGuard(openingAudio);
    }
    return openingAudio;
  };

  const ensureInvitationAudio = () => {
    if (!invitationAudio) {
      invitationAudio = createBufferedAudio(invitationSource, true);
      invitationAudio.volume = 0;
      attachPlaybackGuard(invitationAudio);
    }
    return invitationAudio;
  };

  const activeAudio = () =>
    activeTrack === "opening" ? ensureOpeningAudio() : ensureInvitationAudio();

  const fadeTo = (target: number, duration: number) => {
    const track = activeAudio();
    cancelFade();
    const initialVolume = track.volume;
    const startedAt = performance.now();
    const update = (now: number) => {
      const progress = Math.max(
        0,
        Math.min((now - startedAt) / Math.max(duration, 1), 1),
      );
      track.volume = Math.max(
        0,
        Math.min(1, initialVolume + (target - initialVolume) * progress),
      );
      if (progress < 1) fadeFrame = window.requestAnimationFrame(update);
      else fadeFrame = undefined;
    };
    fadeFrame = window.requestAnimationFrame(update);
  };

  const audibleVolume = () => (isMuted ? 0 : intendedVolume);

  const pause = () => {
    cancelFade();
    openingAudio?.pause();
    invitationAudio?.pause();
  };

  const onVisibilityChange = () => {
    const track = activeAudio();
    if (document.hidden) {
      resumeAfterVisibilityChange = !track.paused;
      pause();
    } else if (resumeAfterVisibilityChange) {
      resumeAfterVisibilityChange = false;
      void track
        .play()
        .then(() => fadeTo(audibleVolume(), 450))
        .catch(() => undefined);
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  const resetInvitationAudio = (nextSource: string) => {
    if (invitationAudio) {
      invitationAudio.pause();
      invitationAudio.removeAttribute("src");
      invitationAudio.load();
      invitationAudio = undefined;
    }
    invitationSource = nextSource;
  };

  const setInvitationSource = (
    nextSource: string,
    options: { manual?: boolean; trackId?: InvitationTrackId } = {},
  ) => {
    const { manual = false, trackId } = options;
    if (manual && trackId) persistManualInvitationTrackId(trackId);
    if (invitationSource === nextSource) return;
    const wasPlaying = Boolean(invitationAudio && !invitationAudio.paused);
    resetInvitationAudio(nextSource);
    if (activeTrack === "invitation" && wasPlaying) {
      void ensureInvitationAudio()
        .play()
        .then(() => fadeTo(audibleVolume(), 900))
        .catch(() => undefined);
    }
  };

  const stopInvitationTrackRotation = () => {
    if (rotationTimer !== undefined) window.clearTimeout(rotationTimer);
    rotationTimer = undefined;
  };

  const scheduleInvitationTrackRotation = () => {
    stopInvitationTrackRotation();
    if (readManualInvitationTrackId()) return;
    rotationTimer = window.setTimeout(() => {
      syncInvitationTrackToClock();
      scheduleInvitationTrackRotation();
    }, getMsUntilNextInvitationTrackWindow() + 60);
  };

  const syncInvitationTrackToClock = (): InvitationTrackId => {
    const trackId = getInvitationTrackIdNow();
    setInvitationSource(getInvitationTrackSrc(trackId), { trackId, manual: false });
    return trackId;
  };

  const startInvitationTrackRotation = () => {
    syncInvitationTrackToClock();
    scheduleInvitationTrackRotation();
  };

  return {
    async play() {
      const track = activeAudio();
      if (!track.paused) {
        if (!isMuted && track.volume < 0.02) fadeTo(audibleVolume(), 300);
        return true;
      }
      try {
        await track.play();
        fadeTo(audibleVolume(), 900);
        return true;
      } catch {
        return false;
      }
    },
    async playOpeningCue() {
      activeTrack = "opening";
      cancelFade();
      return playShankOpeningCue(audibleVolume());
    },
    pause,
    stop() {
      cancelFade();
      for (const track of [openingAudio, invitationAudio]) {
        if (!track) continue;
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
      }
    },
    setVolume(volume) {
      intendedVolume = Math.max(0, Math.min(1, volume));
      cancelFade();
      activeAudio().volume = audibleVolume();
    },
    fadeIn(duration = 900) {
      intendedVolume = WEDDING_MUSIC_VOLUME;
      fadeTo(audibleVolume(), duration);
    },
    fadeOut(duration = 450) {
      intendedVolume = 0;
      fadeTo(0, duration);
    },
    setMuted(muted) {
      isMuted = muted;
      const track = activeAudio();
      if (muted) {
        fadeTo(0, 120);
        return;
      }
      if (track.paused) {
        cancelFade();
        void track
          .play()
          .then(() => fadeTo(audibleVolume(), 220))
          .catch(() => undefined);
        return;
      }
      fadeTo(audibleVolume(), 220);
    },
    setTrack(track) {
      if (activeTrack === track) return;
      cancelFade();
      if (track === "opening") invitationAudio?.pause();
      else openingAudio?.pause();
      activeTrack = track;
    },
    setInvitationSource,
    selectInvitationTrack(trackId: InvitationTrackId, manual = true) {
      if (manual) stopInvitationTrackRotation();
      setInvitationSource(getInvitationTrackSrc(trackId), { manual, trackId });
    },
    syncInvitationTrackToClock,
    startInvitationTrackRotation,
    stopInvitationTrackRotation,
    getInvitationSource() {
      return invitationSource;
    },
    preload() {
      warmCriticalAudio();
      ensureOpeningAudio();
      ensureInvitationAudio();
    },
    unlockForUserGesture() {
      if (typeof window === "undefined") return;
      const opening = ensureOpeningAudio();
      opening.volume = 0;
      primeHtmlAudio(opening);

      const invitation = ensureInvitationAudio();
      invitation.volume = 0;
      primeHtmlAudio(invitation);
    },
    destroy() {
      cancelFade();
      stopInvitationTrackRotation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const track of [openingAudio, invitationAudio]) {
        if (!track) continue;
        track.pause();
        track.removeAttribute("src");
        track.load();
      }
      openingAudio = undefined;
      invitationAudio = undefined;
    },
  };
}

export {
  getInvitationTrackIdNow,
  getInvitationTrackSrc,
  lockInvitationTrackForVisit,
  type InvitationTrackId,
} from "./invitationTracks";
