export const INVITATION_TRACKS = {
  oMaahiDunki: "/assets/audio/o-maahi-dunki.mp3",
  sajna: "/assets/audio/sajna.mp3",
  dooronDooron: "/assets/audio/dooron-dooron.mp3",
  tereNaal: "/assets/audio/tere-naal.mp3",
} as const;

export type InvitationTrackId = keyof typeof INVITATION_TRACKS;

const INVITATION_TRACK_IDS = Object.keys(INVITATION_TRACKS) as InvitationTrackId[];

const SESSION_MANUAL_TRACK_KEY = "vivah-invitation-manual-track-id";
const TRACK_WINDOW_MINUTES = 15;

export function isInvitationTrackId(value: string): value is InvitationTrackId {
  return INVITATION_TRACK_IDS.includes(value as InvitationTrackId);
}

/** Map the visitor's local clock minute to an invitation track id. */
export function getInvitationTrackIdForMinute(minute: number): InvitationTrackId {
  const slot = Math.floor(minute / TRACK_WINDOW_MINUTES) % 4;
  if (slot === 0) return "oMaahiDunki";
  if (slot === 1) return "sajna";
  if (slot === 2) return "dooronDooron";
  return "tereNaal";
}

/** Current invitation track from the visitor's local clock. */
export function getInvitationTrackIdNow(
  date = new Date(),
): InvitationTrackId {
  return getInvitationTrackIdForMinute(date.getMinutes());
}

/** Milliseconds until the next 15-minute track window begins. */
export function getMsUntilNextInvitationTrackWindow(
  date = new Date(),
): number {
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const ms = date.getMilliseconds();
  const nextSlotMinute =
    (Math.floor(minute / TRACK_WINDOW_MINUTES) + 1) * TRACK_WINDOW_MINUTES;
  const minutesUntil =
    nextSlotMinute >= 60 ? 60 - minute : nextSlotMinute - minute;
  return minutesUntil * 60_000 - second * 1_000 - ms;
}

export function getInvitationTrackSrc(trackId: InvitationTrackId): string {
  return INVITATION_TRACKS[trackId];
}

function readSessionTrackId(key: string): InvitationTrackId | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value && isInvitationTrackId(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSessionTrackId(key: string, trackId: InvitationTrackId) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, trackId);
  } catch {
    /* Ignore storage failures and keep in-memory selection. */
  }
}

/** Read a manual track override persisted for this browser session. */
export function readManualInvitationTrackId(): InvitationTrackId | null {
  return readSessionTrackId(SESSION_MANUAL_TRACK_KEY);
}

/** Persist a manual track choice for the rest of this browser session. */
export function persistManualInvitationTrackId(trackId: InvitationTrackId) {
  writeSessionTrackId(SESSION_MANUAL_TRACK_KEY, trackId);
}

/**
 * Resolve the invitation track for right now.
 * Manual session choice wins; otherwise follow the 15-minute clock windows.
 */
export function lockInvitationTrackForVisit(
  minute = new Date().getMinutes(),
): InvitationTrackId {
  const manualTrackId = readManualInvitationTrackId();
  if (manualTrackId) return manualTrackId;
  return getInvitationTrackIdForMinute(minute);
}

export function resolveInvitationTrackSrc(trackId: InvitationTrackId): string {
  return getInvitationTrackSrc(trackId);
}
