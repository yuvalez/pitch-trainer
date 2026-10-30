import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import { cadencePlayback, pcName, tonicName, type Playback } from '../theory/music';
import { pick, randInt } from '../theory/random';
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
import type { Generator, Level } from './types';

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const ALL_PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Root button label: "E" for white keys, "C♯/D♭" (or "דו♯/רה♭") for black keys. */
export function rootLabel(p: number): string {
  const sharp = noteLabel(pcName(60 + p, true)).replace('#', '♯');
  const flat = noteLabel(pcName(60 + p)).replace(/(?<=.)b/, '♭');
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}

const C_REFERENCE: Playback = [{ midi: [60], start: 0, dur: 1.5 }];

/** Lowest note of the chord's root in E3–Eb4 so chords sit in a comfortable register. */
function rootMidi(rootPc: number): number {
  const m = 48 + rootPc;
  return m < 52 ? m + 12 : m;
}

export const generateChordName: Generator = (level: Level, rng, opts) => {
  const { type, set, inversion, mayInvert } = pickChordType(CHORD_LEVELS[level], rng, opts, level === 3);
  const custom = set !== CHORD_LEVELS[level];
  const info = CHORD_TYPES[type];

  const rootPcs = level === 0 && !custom ? NATURAL_PCS : ALL_PCS;
  const rootPc = pick(rng, rootPcs);
  const notes = buildChord(rootMidi(rootPc), type, inversion);
  const sharps = rootPc === 6; // F# reads more naturally than Gb; other black keys use flats.

  const block = (start: number) => ({ midi: notes, start, dur: 2 });
  const arpeggio = notes.map((m, i) => ({ midi: [m], start: 2.5 + i * 0.5, dur: 0.5 }));
  const main: Playback = level <= 1 ? [block(0), ...arpeggio, block(3 + notes.length * 0.5)] : [block(0)];

  let context: Playback | undefined;
  const c = noteLabel('C');
  let lead: string;
  if (level === 2 && !custom) {
    const keyPc = randInt(rng, 0, 11);
    context = cadencePlayback(keyPc, false);
    lead = t('q.chordName.leadKey', { key: t('key.major', { tonic: noteLabel(tonicName(keyPc)) }) });
  } else if (level === 3 && !custom) {
    lead = t('q.chordName.leadNone', { c });
  } else {
    context = C_REFERENCE;
    lead = t('q.chordName.leadC', { c });
  }

  const name = chordName(rootPc, type, sharps);
  const spelled = chordSpelling(rootPc, type, sharps);

  return {
    kind: 'chordName',
    prompt: t('q.chordName.prompt', { lead }),
    context,
    main,
    reference: { label: t('session.hearNote', { note: c }), playback: C_REFERENCE },
    qualities: set.map((v) => ({ value: v, label: chordLabel(v) })),
    rootChoices: rootPcs.map((p) => ({ value: String(p), label: rootLabel(p) })),
    answer: { rootPc, type },
    answerName: name,
    pianoRange: [48, 72],
    item: info.label,
    explanation: t('q.chordName.explain', {
      name,
      spelled,
      label: chordLabel(type),
      sound: chordSound(type),
      inv: playedIn(mayInvert, inversion),
    }),
    learnTopic: 'identify-chords',
  };
};
