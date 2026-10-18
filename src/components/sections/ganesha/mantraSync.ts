/** Auto-generated from public/assets/audio/navkar-mantra.mp3 — node scripts/analyze-mantra.mjs */

export const MANTRA_PLAYBACK_TRIM_START_SEC = 8.23;
export const MANTRA_PLAYBACK_TRIM_END_SEC = 53.73;

export type MantraLineTiming = { word: string; start: number; end: number };

/** Absolute times in navkar-mantra.mp3 (seconds). */
export const mantraTimingsFile: readonly MantraLineTiming[] = [
  { word: 'णमो अरिहंताणं', start: 8.23, end: 13.5 },
  { word: 'णमो सिद्धाणं', start: 13.5, end: 18.76 },
  { word: 'णमो आयरियाणं', start: 18.76, end: 23.82 },
  { word: 'णमो उवज्झायाणं', start: 23.82, end: 28.93 },
  { word: 'णमो लोए सव्व साहूणं', start: 28.93, end: 33.98 },
  { word: 'एसो पंच णमोकारो, सव्व पाव प्पणासणो ।', start: 33.98, end: 39.1 },
  { word: 'मंगलाणं च सव्वेसिं, पढमं हवइ मंगलम ॥', start: 39.1, end: 53.73 },
] as const;

const trim = MANTRA_PLAYBACK_TRIM_START_SEC;

/** Playback timeline: 0 = first णमो at trim. */
export const mantraTimingsPlayback: readonly MantraLineTiming[] = mantraTimingsFile.map(
  (line) => ({
    word: line.word,
    start: Math.max(0, +(line.start - trim).toFixed(2)),
    end: Math.max(0, +(line.end - trim).toFixed(2)),
  }),
);
