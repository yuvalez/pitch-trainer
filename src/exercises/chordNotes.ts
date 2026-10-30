import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import { pc, pcName, type Playback } from '../theory/music';
import { randInt } from '../theory/random';
import {
  CHORD_LEVELS,
  CHORD_TYPES,
  buildChord,
  chordLabel,
  chordName,
  chordSound,
  chordSpelling,
  pickChordType,
  playedIn,
} from './chords';
import { dictationRange } from './dictation';
import type { Generator, Level } from './types';

export const CHORD_NOTES_LEVELS: string[][] = [
  ['maj', 'min'],
  ['maj', 'min', 'dim', 'aug'],
  ['maj7', 'm7', 'dom7', 'm7b5', 'dim7'],
  CHORD_LEVELS[3],
];

export const generateChordNotes: Generator = (level: Level, rng, opts) => {
  const levelSet = CHORD_NOTES_LEVELS[level];
  const { type, set, inversion, mayInvert } = pickChordType(levelSet, rng, opts, level === 3);
  const custom = set !== levelSet;
  const info = CHORD_TYPES[type];

  const root = opts?.fixedRoot ? 60 : level === 3 ? randInt(rng, 50, 62) : randInt(rng, 52, 63);
  const rootPc = pc(root);
  const notes = buildChord(root, type, inversion);
  const sharps = rootPc === 6;
  const rootName = noteLabel(pcName(root, sharps));

  const base = chordName(rootPc, type, sharps);
  const name = inversion > 0 ? `${base}/${pcName(notes[0], sharps)}` : base;

  const block = (start: number) => ({ midi: notes, start, dur: 2 });
  const arpeggio = notes.map((m, i) => ({ midi: [m], start: 2.5 + i * 0.5, dur: 0.5 }));
  const main: Playback = level === 3 && !custom ? [block(0)] : [block(0), ...arpeggio, block(3 + notes.length * 0.5)];

  const requireBass = level === 3 && !custom;
  const given = level === 0 && !custom ? [root] : [];
  const promptKey = level === 0 && !custom ? 'q.chordNotes.given' : requireBass ? 'q.chordNotes.bass' : 'q.chordNotes.root';
  const prompt = t(promptKey, { n: notes.length, root: rootName });

  return {
    kind: 'chordNotes',
    prompt,
    main,
    answer: notes,
    given,
    requireBass,
    sharps,
    answerName: name,
    pianoRange: dictationRange(notes),
    item: info.label,
    explanation: t('q.chordNotes.explain', {
      name,
      spelled: chordSpelling(rootPc, type, sharps),
      label: chordLabel(type),
      sound: chordSound(type),
      inv: playedIn(mayInvert, inversion),
    }),
    learnTopic: 'identify-chords',
  };
};
