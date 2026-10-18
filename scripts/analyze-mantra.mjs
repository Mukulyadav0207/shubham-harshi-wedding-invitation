import fs from 'node:fs';
import path from 'node:path';
import decode from 'audio-decode';

const WORDS = [
  'णमो अरिहंताणं',
  'णमो सिद्धाणं',
  'णमो आयरियाणं',
  'णमो उवज्झायाणं',
  'णमो लोए सव्व साहूणं',
  'एसो पंच णमोकारो, सव्व पाव प्पणासणो ।',
  'मंगलाणं च सव्वेसिं, पढमं हवइ मंगलम ॥',
];

const OUT_PATH = path.join(
  process.cwd(),
  'src/components/sections/ganesha/mantraSync.ts',
);

function splitGraphemes(text) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return [
      ...new Intl.Segmenter('sa', { granularity: 'grapheme' }).segment(text),
    ].map((part) => part.segment);
  }
  return [...text];
}

function rms(frame) {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

function smooth(arr, w) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(arr.length - 1, i + w); j++) {
      s += arr[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
}

const buf = fs.readFileSync('public/assets/audio/navkar-mantra.mp3');
const audio = await decode(buf);
const data = audio.channelData[0];
const sr = audio.sampleRate;
const hop = Math.floor(sr * 0.01);
const frameSec = hop / sr;
const n = Math.floor(data.length / hop);
const energies = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const i0 = i * hop;
  energies[i] = rms(data.subarray(i0, Math.min(data.length, i0 + hop)));
}
const smoothE = smooth(energies, 5);
const heavyE = smooth(smoothE, 14);
const maxE = Math.max(...heavyE);
const duration = data.length / sr;

const flux = new Float32Array(n);
for (let i = 1; i < n; i++) {
  flux[i] = Math.max(0, smoothE[i] - smoothE[i - 1]);
}

/** Skip instrumental pad (~0–8s): first strong vocal lift before steady chant. */
function detectChantStartSec() {
  const introEndIdx = Math.min(n - 1, Math.floor(6.5 / frameSec));
  let introSum = 0;
  for (let i = 0; i < introEndIdx; i++) introSum += heavyE[i];
  const introMean = introSum / Math.max(1, introEndIdx);
  const liftThr = introMean * 1.48;

  const searchFrom = Math.floor(7.4 / frameSec);
  const searchTo = Math.min(n - 1, Math.floor(10.5 / frameSec));

  for (let i = searchFrom; i <= searchTo; i++) {
    if (heavyE[i] >= liftThr && flux[i] >= maxE * 0.008) {
      return i * frameSec;
    }
  }

  let bestI = searchFrom;
  let bestScore = -1;
  for (let i = searchFrom; i <= searchTo; i++) {
    const score = heavyE[i] + flux[i] * 40;
    if (score > bestScore) {
      bestScore = score;
      bestI = i;
    }
  }
  return bestI * frameSec;
}

const chantStart = detectChantStartSec();

let speechEnd = duration;
const tailThr = maxE * 0.1;
for (let i = heavyE.length - 1; i >= 0; i--) {
  if (heavyE[i] > tailThr) {
    speechEnd = (i + 1) * frameSec;
    break;
  }
}

/** Each णमो phrase: energy rise peaks (~5.2s apart in this recording). */
function detectRisePhraseOnsets(startSec, endSec) {
  const threshold = maxE * 0.12;
  const minGap = 5.05;
  const rises = [];
  const iStart = Math.max(5, Math.floor(startSec / frameSec));

  for (let i = iStart; i < n - 3; i++) {
    const t = i * frameSec;
    if (t > endSec - 1.5) break;
    const rise = smoothE[i] - smoothE[i - 4];
    if (rise > maxE * 0.032 && smoothE[i] > threshold) {
      if (!rises.length || t - rises[rises.length - 1] >= minGap) {
        rises.push(t);
      }
    }
  }

  if (rises.length < WORDS.length) {
    const phraseEst = (endSec - startSec) / WORDS.length;
    return WORDS.map((_, k) => +(startSec + k * phraseEst).toFixed(2));
  }

  const onsets = rises.slice(0, WORDS.length);
  onsets[0] = startSec;
  return onsets.map((t) => +t.toFixed(2));
}

const phraseOnsets = detectRisePhraseOnsets(chantStart, speechEnd - 0.3);
const trimStart = +phraseOnsets[0].toFixed(2);
const trimEnd = Math.min(
  duration,
  +(speechEnd - 0.28).toFixed(2),
);

const timings = WORDS.map((word, index) => {
  const start = +phraseOnsets[index].toFixed(2);
  const end =
    index < WORDS.length - 1
      ? +phraseOnsets[index + 1].toFixed(2)
      : +trimEnd.toFixed(2);
  return { word, start, end };
});

const graphemeCounts = WORDS.map((word) => splitGraphemes(word).length);

console.log(
  JSON.stringify(
    {
      duration: +duration.toFixed(2),
      chantStart: +chantStart.toFixed(2),
      trimStart,
      trimEnd,
      playbackSpanSec: +(trimEnd - trimStart).toFixed(2),
      phraseOnsets: phraseOnsets.map((t) => +t.toFixed(2)),
      graphemeCounts,
      timings,
    },
    null,
    2,
  ),
);

const fileBody = `/** Auto-generated from public/assets/audio/navkar-mantra.mp3 — node scripts/analyze-mantra.mjs */

export const MANTRA_PLAYBACK_TRIM_START_SEC = ${trimStart};
export const MANTRA_PLAYBACK_TRIM_END_SEC = ${trimEnd};

export type MantraLineTiming = { word: string; start: number; end: number };

/** Absolute times in navkar-mantra.mp3 (seconds). */
export const mantraTimingsFile: readonly MantraLineTiming[] = [
${timings.map((t) => `  { word: '${t.word}', start: ${t.start}, end: ${t.end} },`).join('\n')}
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
`;

fs.writeFileSync(OUT_PATH, fileBody);
console.log(`\nWrote ${OUT_PATH}`);
