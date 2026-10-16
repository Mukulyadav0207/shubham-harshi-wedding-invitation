/**
 * Single logical timeline for the wedding invitation experience (phases 0–8).
 * Coordinates phase state, decorative-animation priority, and cleanup registration.
 */

export enum MasterPhase {
  EnvelopeIdle = 0,
  EnvelopeOpening = 1,
  CardEmergence = 2,
  CardToGanesha = 3,
  GaneshaReveal = 4,
  MantraIntro = 5,
  InvitationEntrance = 6,
  Scrolling = 7,
  Confetti = 8,
}

/** Opening animation durations (ms). Tuned for snappier card + Ganesha beats. */
export const OPENING_DURATIONS = {
  FLAP_MS: 1600,
  LIFT_MS: 1040,
  ZOOM_MS: 920,
  GANESHA_REVEAL_MS: 1560,
  MANTRA_VISUAL_MS: 1800,
} as const;

/** Cumulative markers from tap (logical story beats). */
export const MASTER_PHASE_MARKERS_MS = {
  TAP: 0,
  CARD_EMERGE_START: OPENING_DURATIONS.FLAP_MS,
  CARD_ZOOM_START:
    OPENING_DURATIONS.FLAP_MS + OPENING_DURATIONS.LIFT_MS,
  GANESHA_START:
    OPENING_DURATIONS.FLAP_MS +
    OPENING_DURATIONS.LIFT_MS +
    OPENING_DURATIONS.ZOOM_MS,
  GANESHA_END:
    OPENING_DURATIONS.FLAP_MS +
    OPENING_DURATIONS.LIFT_MS +
    OPENING_DURATIONS.ZOOM_MS +
    OPENING_DURATIONS.GANESHA_REVEAL_MS,
  MANTRA_END:
    OPENING_DURATIONS.FLAP_MS +
    OPENING_DURATIONS.LIFT_MS +
    OPENING_DURATIONS.ZOOM_MS +
    OPENING_DURATIONS.GANESHA_REVEAL_MS +
    OPENING_DURATIONS.MANTRA_VISUAL_MS,
  INVITATION_ENTRANCE: 8000,
} as const;

export type DecorativeParticleMode = "full" | "reduced" | "paused";

type PhaseListener = (phase: MasterPhase) => void;

class MasterTimelineController {
  private phase = MasterPhase.EnvelopeIdle;
  private sequenceStart = 0;
  private scrollActive = false;
  private phaseCleanups = new Map<MasterPhase, Set<() => void>>();
  private listeners = new Set<PhaseListener>();

  getPhase(): MasterPhase {
    return this.phase;
  }

  getElapsedMs(): number {
    if (!this.sequenceStart) return 0;
    return performance.now() - this.sequenceStart;
  }

  subscribe(listener: PhaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  beginOpeningSequence(): void {
    this.sequenceStart = performance.now();
  }

  setPhase(next: MasterPhase): void {
    if (this.phase === next) return;
    this.runPhaseCleanups(this.phase);
    this.phase = next;
    for (const listener of this.listeners) listener(next);
  }

  setScrollActive(active: boolean): void {
    if (this.scrollActive === active) return;
    this.scrollActive = active;
    if (
      active &&
      this.phase >= MasterPhase.InvitationEntrance &&
      this.phase !== MasterPhase.Confetti
    ) {
      this.setPhase(MasterPhase.Scrolling);
      return;
    }
    if (
      !active &&
      this.phase === MasterPhase.Scrolling
    ) {
      this.setPhase(MasterPhase.InvitationEntrance);
    }
  }

  isScrollActive(): boolean {
    return this.scrollActive;
  }

  /** Whether ambient/decorative canvas loops may run. */
  getDecorativeParticleMode(): DecorativeParticleMode {
    if (this.phase < MasterPhase.InvitationEntrance) return "paused";
    if (this.scrollActive || this.phase === MasterPhase.Scrolling) {
      return "reduced";
    }
    return "full";
  }

  shouldRunDecorativeCanvas(): boolean {
    return this.getDecorativeParticleMode() !== "paused";
  }

  registerPhaseCleanup(phase: MasterPhase, cleanup: () => void): () => void {
    let set = this.phaseCleanups.get(phase);
    if (!set) {
      set = new Set();
      this.phaseCleanups.set(phase, set);
    }
    set.add(cleanup);
    return () => set?.delete(cleanup);
  }

  private runPhaseCleanups(phase: MasterPhase): void {
    const set = this.phaseCleanups.get(phase);
    if (!set) return;
    for (const cleanup of set) cleanup();
    set.clear();
  }

  reset(): void {
    for (const phase of this.phaseCleanups.keys()) {
      this.runPhaseCleanups(phase);
    }
    this.phase = MasterPhase.EnvelopeIdle;
    this.sequenceStart = 0;
    this.scrollActive = false;
  }
}

export const masterTimeline = new MasterTimelineController();
