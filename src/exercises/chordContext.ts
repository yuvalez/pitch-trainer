import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import { cadencePlayback, chordsPlayback, keyUsesSharps, pc, tonicName, voiceChords } from '../theory/music';
import { chance, pick, randInt } from '../theory/random';
import { chordName, typeFromIntervals } from './chords';
import { NUMERALS } from './progressions';
import type { Generator, Level } from './types';

interface ContextDef {
  minor: boolean;
  palette: string[];
  curated: string[][];
  randomShare: number;
}

const CHROMATIC = ['V/V', 'V/vi', 'iv', '♭VI', '♭VII'];

export const CONTEXT_LEVELS: ContextDef[][] = [
  [
    {
      minor: false,
      palette: ['I', 'IV', 'V'],
      curated: [
        ['I', 'IV', 'V', 'I'],
        ['I', 'V', 'IV', 'I'],
        ['I', 'IV', 'I', 'V'],
        ['I', 'V', 'I', 'IV'],
        ['IV', 'I', 'V', 'I'],
      ],
      randomShare: 0.4,
    },
  ],
  [
    {
      minor: false,
      palette: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
      curated: [
        ['I', 'V', 'vi', 'IV'],
        ['I', 'vi', 'IV', 'V'],
        ['vi', 'IV', 'I', 'V'],
        ['I', 'iii', 'IV', 'V'],
        ['ii', 'V', 'I', 'vi'],
        ['I', 'vi', 'ii', 'V'],
        ['IV', 'V', 'iii', 'vi'],
        ['I', 'IV', 'vii°', 'I'],
      ],
      randomShare: 0.3,
    },
  ],
  [
    {
      minor: false,
      palette: ['I', 'ii', 'iii', 'IV', 'V', 'V7', 'vi'],
      curated: [
        ['ii', 'V7', 'I', 'I'],
        ['I', 'vi', 'ii', 'V7'],
        ['iii', 'vi', 'ii', 'V7'],
        ['I', 'IV', 'V7', 'I'],
        ['vi', 'ii', 'V7', 'I'],
        ['I', 'iii', 'vi', 'IV'],
      ],
      randomShare: 0,
    },
    {
      minor: true,
      palette: ['i', 'ii°', 'III', 'iv', 'v', 'V', 'V7', 'VI', 'VII'],
      curated: [
        ['i', 'VI', 'III', 'VII'],
        ['i', 'iv', 'V7', 'i'],
        ['ii°', 'V7', 'i', 'i'],
        ['i', 'VII', 'VI', 'V'],
        ['i', 'iv', 'VII', 'III'],
        ['i', 'v', 'iv', 'i'],
      ],
      randomShare: 0,
    },
  ],
  [
    {
      minor: false,
      palette: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'V/V', 'V/vi', 'iv', '♭VI', '♭VII'],
      curated: [
        ['I', 'V/V', 'V', 'I'],
        ['I', 'V/vi', 'vi', 'IV'],
        ['I', 'IV', 'iv', 'I'],
        ['I', '♭VII', 'IV', 'I'],
        ['I', '♭VI', '♭VII', 'I'],
        ['I', 'vi', 'V/V', 'V'],
        ['IV', 'iv', 'I', 'V/vi'],
        ['I', 'iii', 'V/vi', 'vi'],
      ],
      randomShare: 0,
    },
  ],
];

/** Display label like "IV (F)" for a numeral in a key. */
export function numeralLabel(numeral: string, tonicPc: number, minor: boolean): string {
  const spec = NUMERALS[numeral];
  const type = typeFromIntervals(spec.intervals) ?? 'maj';
  const sharps = keyUsesSharps(tonicPc, minor) && !numeral.startsWith('♭');
  return `${numeral} (${chordName(pc(tonicPc + spec.root), type, sharps)})`;
}

export const generateChordContext: Generator = (level: Level, rng, opts) => {
  const def = pick(rng, CONTEXT_LEVELS[level]);
  const tonic = def.minor ? 'i' : 'I';
  let chords: string[];
  if (chance(rng, def.randomShare)) {
    chords = [tonic];
    while (chords.length < 4) chords.push(pick(rng, def.palette.filter((c) => c !== chords[chords.length - 1])));
  } else {
    chords = pick(rng, def.curated);
  }

  // Prefer a target that isn't the tonic; at Expert, usually target the chromatic chord.
  const all = chords.map((_, i) => i);
  const nonTonic = all.filter((i) => chords[i] !== tonic);
  const chromatic = all.filter((i) => CHROMATIC.includes(chords[i]));
  const target =
    chromatic.length && chance(rng, 0.7)
      ? pick(rng, chromatic)
      : pick(rng, nonTonic.length ? nonTonic : all);

  const tonicPc = opts?.fixedRoot ? 0 : randInt(rng, 0, 11);
  const voiced = voiceChords(
    tonicPc,
    chords.map((c) => NUMERALS[c]),
  );
  const keyName = t(def.minor ? 'key.minor' : 'key.major', { tonic: noteLabel(tonicName(tonicPc, def.minor)) });
  const answer = chords[target];
  const label = (n: string) => numeralLabel(n, tonicPc, def.minor);

  return {
    kind: 'choice',
    prompt: t('q.context.prompt', { key: keyName, n: target + 1 }),
    context: cadencePlayback(tonicPc, def.minor),
    main: chordsPlayback(voiced, 2),
    highlight: { index: target, count: chords.length, alone: [{ midi: voiced[target], start: 0, dur: 2.5 }] },
    choices: def.palette.map((n) => ({ value: n, label: label(n) })),
    answer,
    item: answer,
    explanation: t('q.context.explain', {
      n: target + 1,
      label: label(answer),
      key: keyName,
      prog: chords.map(label).join(' – '),
    }),
    learnTopic: 'harmony',
  };
};
