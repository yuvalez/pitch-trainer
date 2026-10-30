import { t, tDyn } from '../i18n';
import { noteLabel, notesLabel } from '../i18n/notes';
import {
  MAJ,
  MIN,
  chordsPlayback,
  degreeToMidi,
  melodyPlayback,
  scaleNoteNames,
  tonicName,
  triadOnDegree,
  voiceChords,
  type ChordSpec,
} from '../theory/music';
import { chance, pick, randInt, type Rng } from '../theory/random';
import type { Generator, Level } from './types';

interface ModeInfo {
  /** English name. Also the stable key for per-item stats; display text comes from `modeLabel`. */
  label: string;
  tonal: string;
  scale: number[];
  minorish: boolean;
  /** 0-based scale degree that gives the mode its flavour. */
  colorDegree: number;
  colorText: string;
  /** Progressions as 1-based scale degrees; triads are built from the mode's own scale. */
  progressions: number[][];
}

export const MODES: Record<string, ModeInfo> = {
  major: {
    label: 'Major (Ionian)',
    tonal: 'major',
    scale: [0, 2, 4, 5, 7, 9, 11],
    minorish: false,
    colorDegree: 6,
    colorText: 'the leading tone (7th) pulls strongly up to the tonic',
    progressions: [
      [1, 4, 5, 1],
      [1, 6, 4, 5, 1],
      [1, 5, 6, 4, 1],
      [6, 4, 5, 1],
      [2, 5, 1],
    ],
  },
  minor: {
    label: 'Minor (Aeolian)',
    tonal: 'minor',
    scale: [0, 2, 3, 5, 7, 8, 10],
    minorish: true,
    colorDegree: 5,
    colorText: 'the minor 3rd and ♭6 give it a sad, dark colour',
    progressions: [
      [1, 6, 7, 1],
      [1, 6, 3, 7, 1],
      [1, 7, 6, 7, 1],
      [1, 4, 7, 3, 1],
      [1, 4, 5, 1],
    ],
  },
  dorian: {
    label: 'Dorian',
    tonal: 'dorian',
    scale: [0, 2, 3, 5, 7, 9, 10],
    minorish: true,
    colorDegree: 5,
    colorText: 'a minor scale with a bright major 6th (the major IV chord gives it away)',
    progressions: [
      [1, 4, 1, 4, 1],
      [1, 2, 4, 1],
      [1, 4, 7, 1],
    ],
  },
  phrygian: {
    label: 'Phrygian',
    tonal: 'phrygian',
    scale: [0, 1, 3, 5, 7, 8, 10],
    minorish: true,
    colorDegree: 1,
    colorText: 'the ♭2 a half step above the tonic sounds Spanish or metal',
    progressions: [
      [1, 2, 1, 2, 1],
      [1, 2, 3, 2, 1],
      [1, 7, 2, 1],
    ],
  },
  lydian: {
    label: 'Lydian',
    tonal: 'lydian',
    scale: [0, 2, 4, 6, 7, 9, 11],
    minorish: false,
    colorDegree: 3,
    colorText: 'the raised #4 sounds floating and cinematic (major II chord)',
    progressions: [
      [1, 2, 1, 2, 1],
      [1, 2, 7, 1],
      [1, 2, 3, 2, 1],
    ],
  },
  mixolydian: {
    label: 'Mixolydian',
    tonal: 'mixolydian',
    scale: [0, 2, 4, 5, 7, 9, 10],
    minorish: false,
    colorDegree: 6,
    colorText: 'a major scale with a ♭7, the rock and blues sound of the ♭VII chord',
    progressions: [
      [1, 7, 4, 1],
      [1, 7, 1, 7, 1],
      [1, 5, 4, 1],
    ],
  },
  locrian: {
    label: 'Locrian',
    tonal: 'locrian',
    scale: [0, 1, 3, 5, 6, 8, 10],
    minorish: true,
    colorDegree: 4,
    colorText: 'the ♭5 makes the tonic chord diminished and unstable',
    progressions: [
      [1, 2, 1, 2, 1],
      [1, 3, 2, 1],
    ],
  },
  harmonicMinor: {
    label: 'Harmonic minor',
    tonal: 'harmonic minor',
    scale: [0, 2, 3, 5, 7, 8, 11],
    minorish: true,
    colorDegree: 6,
    colorText: 'a minor scale with a raised 7th, giving a major V chord and an exotic ♭6–7 gap',
    progressions: [
      [1, 4, 5, 1],
      [1, 6, 5, 1],
      [1, 2, 5, 1],
    ],
  },
};

export const modeLabel = (id: string): string => tDyn(`scale.${id}`, MODES[id]?.label ?? id);
export const modeColor = (id: string): string => tDyn(`scaleColor.${id}`, MODES[id]?.colorText ?? '');

/** Major-key progressions with chords borrowed from the parallel minor (expert level). */
const BORROWED_MAJOR: ChordSpec[][] = [
  [
    { root: 0, intervals: MAJ },
    { root: 5, intervals: MAJ },
    { root: 5, intervals: MIN },
    { root: 0, intervals: MAJ },
  ],
  [
    { root: 0, intervals: MAJ },
    { root: 8, intervals: MAJ },
    { root: 10, intervals: MAJ },
    { root: 0, intervals: MAJ },
  ],
  [
    { root: 0, intervals: MAJ },
    { root: 10, intervals: MAJ },
    { root: 5, intervals: MAJ },
    { root: 0, intervals: MAJ },
  ],
];

interface LevelDef {
  askTonic: boolean;
  modes: string[];
  melodyShare: number;
  borrowedShare: number;
}

const LEVELS: LevelDef[] = [
  { askTonic: false, modes: ['major', 'minor'], melodyShare: 0, borrowedShare: 0 },
  { askTonic: true, modes: ['major', 'minor'], melodyShare: 0, borrowedShare: 0 },
  { askTonic: true, modes: ['major', 'minor', 'dorian', 'mixolydian'], melodyShare: 0.35, borrowedShare: 0 },
  {
    askTonic: true,
    modes: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'harmonicMinor'],
    melodyShare: 0.4,
    borrowedShare: 0.15,
  },
];

/**
 * A melody that starts and ends on the tonic, moves mostly by step,
 * and touches the mode's colour note so the mode is identifiable.
 */
export function modalMelody(rng: Rng, tonicMidi: number, mode: ModeInfo): number[] {
  const length = randInt(rng, 8, 10);
  const colorAt = randInt(rng, 2, length - 4);
  const degrees = [0];
  for (let i = 1; i < length - 1; i++) {
    const prev = degrees[i - 1];
    if (i === colorAt) {
      // Use whichever octave of the colour note is closest to the previous note.
      const c = mode.colorDegree;
      degrees.push(Math.abs(c - prev) <= Math.abs(c - 7 - prev) ? c : c - 7);
      continue;
    }
    let next = prev;
    while (next === prev || next < -2 || next > 8) {
      next = prev + pick(rng, [-1, 1, -1, 1, -2, 2]);
    }
    degrees.push(next);
  }
  // Approach the final tonic from a neighbour.
  degrees[length - 2] = pick(rng, [1, -1]);
  if (degrees[length - 3] === degrees[length - 2]) degrees[length - 3] = 2;
  degrees.push(0);
  return degrees.map((d) => degreeToMidi(tonicMidi, mode.scale, d));
}

export const generateKeyId: Generator = (level: Level, rng, opts) => {
  const def = LEVELS[level];
  const modeId = pick(rng, def.modes);
  const mode = MODES[modeId];
  const tonicPc = opts?.fixedRoot ? 0 : randInt(rng, 0, 11);

  const useMelody = chance(rng, def.melodyShare);
  const useBorrowed = !useMelody && modeId === 'major' && chance(rng, def.borrowedShare);

  // On levels below expert, "minor" also covers harmonic-minor progressions (major V chord).
  const scale =
    modeId === 'minor' && level < 3 && chance(rng, 0.35) ? MODES.harmonicMinor.scale : mode.scale;

  let main;
  if (useMelody) {
    main = melodyPlayback(modalMelody(rng, 60 + (tonicPc > 6 ? tonicPc - 12 : tonicPc), mode), 0.75);
  } else {
    const chords = useBorrowed
      ? pick(rng, BORROWED_MAJOR)
      : pick(rng, mode.progressions).map((d) => triadOnDegree(scale, d));
    main = chordsPlayback(voiceChords(tonicPc, chords), 1.5);
  }

  const name = tonicName(tonicPc, mode.minorish);
  const scaleNotes = notesLabel(scaleNoteNames(name, mode.tonal).join(' '));
  const keyLabel = def.askTonic ? t('key.withMode', { tonic: noteLabel(name), mode: modeLabel(modeId) }) : modeLabel(modeId);
  const borrowed = useBorrowed ? t('q.key.borrowed') : '';

  return {
    kind: 'key',
    prompt: t(!def.askTonic ? 'q.key.promptMajMin' : useMelody ? 'q.key.promptMelody' : 'q.key.promptProgression'),
    main,
    askTonic: def.askTonic,
    modes: def.modes.map((m) => ({ value: m, label: modeLabel(m) })),
    answer: { tonicPc, mode: modeId },
    tonicName: name,
    pianoRange: [48, 72],
    item: mode.label,
    explanation: t('q.key.explain', { key: keyLabel, notes: scaleNotes, color: modeColor(modeId), borrowed }),
    learnTopic: 'scales',
  };
};
