import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import {
  HARMONIC_MINOR_SCALE,
  MAJOR_SCALE,
  NATURAL_MINOR_SCALE,
  cadencePlayback,
  degreeToMidi,
  keyUsesSharps,
  melodyPlayback,
  pc,
  tonicName,
} from '../theory/music';
import { chance, pick, randInt, type Rng } from '../theory/random';
import type { Generator, Level } from './types';

interface LevelDef {
  lengths: [number, number];
  /** Largest leap in scale steps. */
  maxLeap: number;
  /** Probability of a step (vs. a leap) for each move. */
  stepShare: number;
  /** Leaps must land on tonic-triad degrees. */
  leapToTriad: boolean;
  minorShare: number;
  chromatic: number;
}

const LEVELS: LevelDef[] = [
  { lengths: [3, 3], maxLeap: 1, stepShare: 1, leapToTriad: true, minorShare: 0, chromatic: 0 },
  { lengths: [4, 5], maxLeap: 4, stepShare: 0.6, leapToTriad: true, minorShare: 0, chromatic: 0 },
  { lengths: [6, 6], maxLeap: 4, stepShare: 0.5, leapToTriad: false, minorShare: 0.5, chromatic: 0 },
  { lengths: [8, 8], maxLeap: 7, stepShare: 0.4, leapToTriad: false, minorShare: 0.5, chromatic: 2 },
];

const MIN_DEGREE = -3;
const MAX_DEGREE = 9;
const isTriadDegree = (d: number) => [0, 2, 4].includes(((d % 7) + 7) % 7);

function nextDegree(rng: Rng, prev: number, def: LevelDef): number {
  const steps = [prev - 1, prev + 1];
  const leaps: number[] = [];
  for (let d = MIN_DEGREE; d <= MAX_DEGREE; d++) {
    const dist = Math.abs(d - prev);
    if (dist < 2 || dist > def.maxLeap) continue;
    if (def.leapToTriad && !isTriadDegree(d)) continue;
    leaps.push(d);
  }
  const options = leaps.length && !chance(rng, def.stepShare) ? leaps : steps;
  return pick(
    rng,
    options.filter((d) => d >= MIN_DEGREE && d <= MAX_DEGREE),
  );
}

export function dictationRange(notes: number[]): [number, number] {
  const lo = 12 * Math.floor(Math.min(...notes) / 12);
  const hi = Math.max(lo + 24, 12 * Math.ceil((Math.max(...notes) + 1) / 12));
  return [lo, hi];
}

export const generateDictation: Generator = (level: Level, rng, opts) => {
  const def = LEVELS[level];
  const minor = chance(rng, def.minorShare);
  const scale = minor ? pick(rng, [NATURAL_MINOR_SCALE, HARMONIC_MINOR_SCALE]) : MAJOR_SCALE;
  const tonic = level === 0 || opts?.fixedRoot ? 60 : randInt(rng, 57, 67);
  const length = randInt(rng, def.lengths[0], def.lengths[1]);

  const degrees = [pick(rng, [0, 2, 4])];
  while (degrees.length < length) {
    degrees.push(nextDegree(rng, degrees[degrees.length - 1], def));
  }
  const notes = degrees.map((d) => degreeToMidi(tonic, scale, d));

  // Expert: chromatic alterations on inner notes, never creating a repeated note.
  for (let k = 0; k < def.chromatic; k++) {
    const i = randInt(rng, 1, length - 2);
    const altered = notes[i] + pick(rng, [-1, 1]);
    if (altered !== notes[i - 1] && altered !== notes[i + 1] && !scale.includes(pc(altered - tonic))) {
      notes[i] = altered;
    }
  }

  const keyKey = minor ? (scale === HARMONIC_MINOR_SCALE ? 'key.harmonicMinor' : 'key.minor') : 'key.major';
  const key = t(keyKey, { tonic: noteLabel(tonicName(tonic, minor)) });
  const scaleType = minor ? 'Minor-key melodies' : 'Major-key melodies';
  return {
    kind: 'dictation',
    prompt: t('q.dictation.prompt', { n: length, key }),
    context: cadencePlayback(pc(tonic), minor),
    main: melodyPlayback(notes, 1),
    answer: notes,
    given: 1,
    sharps: keyUsesSharps(tonic, minor),
    pianoRange: dictationRange(notes),
    item: def.chromatic ? 'Chromatic melodies' : scaleType,
    explanation: t('q.dictation.explain', { key }),
    learnTopic: 'by-ear',
  };
};
