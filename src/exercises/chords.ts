import { t, tDyn } from '../i18n';
import { notesLabel } from '../i18n/notes';
import { chordNoteNames, midiName, pc, pcName } from '../theory/music';
import { randInt, weightedPick, type Rng } from '../theory/random';
import type { GenerateOptions, Generator, Level } from './types';

interface ChordInfo {
  /** English name. Also the stable key for per-item stats; display text comes from `chordLabel`. */
  label: string;
  /** tonal chord symbol, used for spelling. */
  symbol: string;
  /** Suffix used in chord names shown to the user, e.g. "m7" in "Dm7". */
  suffix: string;
  semis: number[];
  sound: string;
}

export const CHORD_TYPES: Record<string, ChordInfo> = {
  maj: { label: 'Major', symbol: 'M', suffix: '', semis: [0, 4, 7], sound: 'bright and stable' },
  min: { label: 'Minor', symbol: 'm', suffix: 'm', semis: [0, 3, 7], sound: 'darker, sadder' },
  dim: { label: 'Diminished', symbol: 'dim', suffix: '°', semis: [0, 3, 6], sound: 'tense, unstable, two stacked minor 3rds' },
  aug: { label: 'Augmented', symbol: 'aug', suffix: '+', semis: [0, 4, 8], sound: 'dreamy and unresolved, two stacked major 3rds' },
  maj7: { label: 'Major 7th', symbol: 'maj7', suffix: 'maj7', semis: [0, 4, 7, 11], sound: 'lush and jazzy, the 7th is a half step below the octave' },
  m7: { label: 'Minor 7th', symbol: 'm7', suffix: 'm7', semis: [0, 3, 7, 10], sound: 'mellow, soulful' },
  dom7: { label: 'Dominant 7th', symbol: '7', suffix: '7', semis: [0, 4, 7, 10], sound: 'bluesy and pulling to resolve' },
  sus2: { label: 'Sus2', symbol: 'sus2', suffix: 'sus2', semis: [0, 2, 7], sound: 'open and airy, no 3rd' },
  sus4: { label: 'Sus4', symbol: 'sus4', suffix: 'sus4', semis: [0, 5, 7], sound: 'suspended, wants to fall to the 3rd' },
  m7b5: { label: 'Half-diminished (m7♭5)', symbol: 'm7b5', suffix: 'm7♭5', semis: [0, 3, 6, 10], sound: 'dark and yearning, the ii chord of minor keys' },
  dim7: { label: 'Diminished 7th', symbol: 'dim7', suffix: '°7', semis: [0, 3, 6, 9], sound: 'very tense, stacked minor 3rds all the way' },
  dom9: { label: 'Dominant 9th', symbol: '9', suffix: '9', semis: [0, 4, 7, 10, 14], sound: 'funky dominant with extra colour' },
  maj9: { label: 'Major 9th', symbol: 'maj9', suffix: 'maj9', semis: [0, 4, 7, 11, 14], sound: 'soft, rich, neo-soul' },
  m9: { label: 'Minor 9th', symbol: 'm9', suffix: 'm9', semis: [0, 3, 7, 10, 14], sound: 'smooth and moody' },
};

export const CHORD_LEVELS: string[][] = [
  ['maj', 'min'],
  ['maj', 'min', 'dim', 'aug'],
  ['maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'sus2', 'sus4'],
  ['maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'sus2', 'sus4', 'm7b5', 'dim7', 'dom9', 'maj9', 'm9'],
];

/** Localised chord type name, e.g. "Minor 7th". */
export const chordLabel = (type: string): string => tDyn(`chord.${type}`, CHORD_TYPES[type]?.label ?? type);

/** Localised description of how a chord type sounds. */
export const chordSound = (type: string): string => tDyn(`chordSound.${type}`, CHORD_TYPES[type]?.sound ?? '');

export const inversionName = (i: number): string => tDyn(`inv.${i}`, String(i));

/** " Played in 1st inversion." when the question could have been inverted, else "". */
export const playedIn = (mayInvert: boolean, inversion: number): string =>
  mayInvert ? t('q.playedIn', { inv: inversionName(inversion) }) : '';

/** Chord notes from a root, optionally inverted (lowest notes moved up an octave). */
export function buildChord(root: number, type: string, inversion = 0): number[] {
  let notes = CHORD_TYPES[type].semis.map((s) => root + s);
  for (let i = 0; i < inversion; i++) notes = [...notes.slice(1), notes[0] + 12];
  return notes;
}

/** Display name, e.g. ("D", "m7") -> "Dm7". */
export function chordName(rootPc: number, type: string, sharps = false): string {
  return `${pcName(60 + pc(rootPc), sharps)}${CHORD_TYPES[type].suffix}`;
}

/** Spelled chord tones for display, e.g. "D F A C" (or solfège). */
export function chordSpelling(rootPc: number, type: string, sharps = false): string {
  const notes = chordNoteNames(pcName(60 + pc(rootPc), sharps), CHORD_TYPES[type].symbol);
  return notes.length ? notesLabel(notes.join(' ')) : '';
}

/** Chord type id for a set of intervals above the root, if it is one we know. */
export function typeFromIntervals(intervals: readonly number[]): string | undefined {
  const key = intervals.join(',');
  return Object.keys(CHORD_TYPES).find((t) => CHORD_TYPES[t].semis.join(',') === key);
}

export interface ChordPick {
  type: string;
  set: string[];
  inversion: number;
  /** Whether this question could have been inverted (shown in the prompt without giving the answer away). */
  mayInvert: boolean;
}

/**
 * Choose a chord type for a question. Custom practice options override the level's set,
 * and their weights make missed types come up more often.
 */
export function pickChordType(levelSet: string[], rng: Rng, opts: GenerateOptions | undefined, invertByDefault: boolean): ChordPick {
  const custom = opts?.chordTypes?.filter((t) => t in CHORD_TYPES) ?? [];
  const set = custom.length >= 2 ? custom : levelSet;
  const type = weightedPick(rng, set, custom.length >= 2 ? opts?.weights : undefined);
  const invert = custom.length >= 2 ? !!opts?.inversions : invertByDefault;
  // 9th chords stay in root position to stay recognisable.
  const n = CHORD_TYPES[type].semis.length;
  const inversion = invert && n <= 4 ? randInt(rng, 0, n - 1) : 0;
  return { type, set, inversion, mayInvert: invert };
}

export const generateChord: Generator = (level: Level, rng, opts) => {
  const { type, set, inversion, mayInvert } = pickChordType(CHORD_LEVELS[level], rng, opts, level === 3);
  const info = CHORD_TYPES[type];

  const root = opts?.fixedRoot ? 60 : level === 3 ? randInt(rng, 50, 62) : randInt(rng, 52, 64);
  const notes = buildChord(root, type, inversion);

  const arpStep = 0.5;
  const arpeggio = notes.map((m, i) => ({ midi: [m], start: i * arpStep, dur: arpStep }));
  const block = { midi: notes, start: notes.length * arpStep + 0.5, dur: 2.5 };
  const main = level === 3 ? [{ midi: notes, start: 0, dur: 2.5 }] : [...arpeggio, block];

  const spelled = chordSpelling(root, type) || notesLabel(notes.map((n) => midiName(n)).join(' '));

  return {
    kind: 'choice',
    prompt: t(mayInvert ? 'q.chord.promptInv' : 'q.chord.prompt'),
    main,
    choices: set.map((v) => ({ value: v, label: chordLabel(v) })),
    answer: type,
    item: info.label,
    explanation: t('q.chord.explain', {
      spelled,
      label: chordLabel(type),
      sound: chordSound(type),
      inv: playedIn(mayInvert, inversion),
    }),
    learnTopic: 'chords',
  };
};
