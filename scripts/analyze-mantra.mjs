import fs from 'node:fs';
import decode from 'audio-decode';

const WORDS = [
  'वक्रतुण्ड',
  'महाकाय',
  'सूर्यकोटि',
  'समप्रभः',
  'निर्विघ्नं',
  'कुरु',
  'मे',
  'देव',
  'शुभकार्येषु',
  'सर्वदा॥',
];

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

const buf = fs.readFileSync('public/assets/audio/ganesha-mantra.mp3');
const audio = await decode(buf);
const data = audio.channelData[0];
const sr = audio.sampleRate;
const hop = Math.floor(sr * 0.01);
const energies = [];
for (let i = 0; i < data.length; i += hop) {
  const end = Math.min(data.length, i + hop);
  energies.push(rms(data.subarray(i, end)));
}
const smoothE = smooth(Float32Array.from(energies), 6);
const heavyE = smooth(smoothE, 20);
const maxE = Math.max(...heavyE);
const threshold = maxE * 0.12;
const duration = data.length / sr;

let speechStart = 0;
let speechEnd = duration;
for (let i = 0; i < heavyE.length; i++) {
  if (heavyE[i] > threshold) {
    speechStart = i * 0.01;
    break;
  }
}
for (let i = heavyE.length - 1; i >= 0; i--) {
  if (heavyE[i] > threshold) {
    speechEnd = (i + 1) * 0.01;
    break;
  }
}

// Pick ~10 coarse phrase onsets (min gap derived from speech length).
const minGap = (speechEnd - speechStart) / 10.2;
const coarseOnsets = [];
for (let i = 2; i < smoothE.length; i++) {
  const rise = smoothE[i] - smoothE[i - 3];
  if (rise > maxE * 0.04 && smoothE[i] > threshold) {
    const t = i * 0.01;
    if (!coarseOnsets.length || t - coarseOnsets[coarseOnsets.length - 1] >= minGap) {
      coarseOnsets.push(t);
    }
  }
}

const graphemeCounts = WORDS.map((word) => splitGraphemes(word).length);
const totalGraphemes = graphemeCounts.reduce((sum, count) => sum + count, 0);

function graphemeWeightedTimings(start, end) {
  const span = end - start;
  let cursor = start;
  return WORDS.map((word, index) => {
    const wordStart = cursor;
    const share = (graphemeCounts[index] / totalGraphemes) * span;
    cursor += share;
    const wordEnd = index < WORDS.length - 1 ? cursor : end;
    return {
      word,
      start: +wordStart.toFixed(2),
      end: +wordEnd.toFixed(2),
    };
  });
}

function onsetAnchoredTimings() {
  let starts = coarseOnsets.slice(0, 10);
  if (starts.length < 10) {
    const weighted = graphemeWeightedTimings(speechStart, speechEnd);
    starts = weighted.map((timing) => timing.start);
  } else if (starts.length > 10) {
    starts = starts.slice(0, 10);
  }

  if (starts[0] > speechStart + 0.2) {
    starts[0] = Math.max(speechStart, starts[0] - 0.12);
  }

  return WORDS.map((word, index) => {
    const start = index === 0 ? Math.max(speechStart, starts[index]) : starts[index];
    const end =
      index < WORDS.length - 1
        ? starts[index + 1] - 0.05
        : speechEnd - 0.35;
    return {
      word,
      start: +start.toFixed(2),
      end: +Math.max(start + 0.15, end).toFixed(2),
    };
  });
}

const weighted = graphemeWeightedTimings(speechStart + 0.05, speechEnd - 0.4);
const anchored = onsetAnchoredTimings();

// Blend: use onset anchors where we have them, fall back to weighted ends.
const timings = anchored.map((timing, index) => {
  const weight = weighted[index];
  const start = index === 0 ? speechStart : timing.start;
  const end =
    index < WORDS.length - 1
      ? timing.end
      : Math.max(timing.end, weight.end);
  return {
    word: timing.word,
    start: +start.toFixed(2),
    end: +end.toFixed(2),
  };
});

// Ensure monotonic non-overlapping spans.
for (let i = 1; i < timings.length; i++) {
  if (timings[i].start < timings[i - 1].end) {
    timings[i].start = timings[i - 1].end + 0.02;
  }
  if (timings[i].end <= timings[i].start) {
    timings[i].end = timings[i].start + 0.2;
  }
}
timings[0].start = +speechStart.toFixed(2);
timings[timings.length - 1].end = +(speechEnd - 0.25).toFixed(2);

console.log(
  JSON.stringify(
    {
      duration: +duration.toFixed(2),
      speechStart: +speechStart.toFixed(2),
      speechEnd: +speechEnd.toFixed(2),
      minGap: +minGap.toFixed(2),
      coarseOnsets: coarseOnsets.map((t) => +t.toFixed(2)),
      graphemeCounts,
      timings,
    },
    null,
    2,
  ),
);

console.log('\nexport const mantraTimings = [');
for (const t of timings) {
  console.log(`  { word: '${t.word}', start: ${t.start}, end: ${t.end} },`);
}
console.log('] as const;');
