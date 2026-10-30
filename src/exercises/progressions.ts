import { t } from '../i18n';
import { noteLabel } from '../i18n/notes';
import {
  DIM,
  DOM7,
  MAJ,
  MIN,
  cadencePlayback,
  chordsPlayback,
  tonicName,
  voiceChords,
  type ChordSpec,
} from '../theory/music';
import { chance, pick, randInt } from '../theory/random';
import type { Generator, Level } from './types';

/** Roman numerals relative to the tonic. Lowercase = minor, ° = diminished. */
export const NUMERALS: Record<string, ChordSpec> = {
  I: { root: 0, intervals: MAJ },
  ii: { root: 2, intervals: MIN },
  iii: { root: 4, intervals: MIN },
  IV: { root: 5, intervals: MAJ },
  V: { root: 7, intervals: MAJ },
  V7: { root: 7, intervals: DOM7 },
  vi: { root: 9, intervals: MIN },
  'vii°': { root: 11, intervals: DIM },
  i: { root: 0, intervals: MIN },
  'ii°': { root: 2, intervals: DIM },
  III: { root: 3, intervals: MAJ },
  iv: { root: 5, intervals: MIN },
  v: { root: 7, intervals: MIN },
  VI: { root: 8, intervals: MAJ },
  VII: { root: 10, intervals: MAJ },
  'V/V': { root: 2, intervals: DOM7 },
  'V/vi': { root: 4, intervals: DOM7 },
  '♭VI': { root: 8, intervals: MAJ },
  '♭VII': { root: 10, intervals: MAJ },
};

interface LevelDef {
  minor: boolean;
  palette: string[];
  curated: string[][];
  /** Probability of a random progression drawn from the palette instead of a curated one. */
  randomShare: number;
}

const MAJOR_BASIC = ['I', 'ii', 'iii', 'IV', 'V', 'vi'];
const MINOR_PALETTE = ['i', 'ii°', 'III', 'iv', 'v', 'V', 'VI', 'VII'];

const LEVELS: LevelDef[][] = [
  [
    {
      minor: false,
      palette: ['I', 'IV', 'V'],
      curated: [
        ['I', 'IV', 'V', 'I'],
        ['I', 'V', 'IV', 'I'],
        ['I', 'IV', 'I', 'V'],
      ],
      randomShare: 0.6,
    },
  ],
  [
    {
      minor: false,
      palette: ['I', 'ii', 'IV', 'V', 'vi'],
      curated: [
        ['I', 'V', 'vi', 'IV'],
        ['I', 'vi', 'IV', 'V'],
        ['vi', 'IV', 'I', 'V'],
        ['I', 'IV', 'vi', 'V'],
        ['I', 'ii', 'V', 'I'],
        ['I', 'vi', 'ii', 'V'],
        ['IV', 'V', 'vi', 'I'],
      ],
      randomShare: 0.3,
    },
  ],
  [
    {
      minor: false,
      palette: MAJOR_BASIC,
      curated: [
        ['ii', 'V', 'I', 'I'],
        ['I', 'iii', 'vi', 'IV'],
        ['I', 'iii', 'IV', 'V'],
        ['iii', 'vi', 'ii', 'V'],
        ['I', 'vi', 'iii', 'IV'],
        ['vi', 'ii', 'V', 'I'],
      ],
      randomShare: 0,
    },
    {
      minor: true,
      palette: MINOR_PALETTE,
      curated: [
        ['i', 'VI', 'III', 'VII'],
        ['i', 'iv', 'V', 'i'],
        ['i', 'VII', 'VI', 'V'],
        ['i', 'iv', 'VII', 'III'],
        ['ii°', 'V', 'i', 'i'],
        ['i', 'VI', 'iv', 'V'],
        ['i', 'v', 'iv', 'i'],
      ],
      randomShare: 0,
    },
  ],
  [
    {
      minor: false,
      palette: [...MAJOR_BASIC, 'V/V', 'V/vi', 'iv', '♭VI', '♭VII'],
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

function randomProgression(rng: () => number, def: LevelDef): string[] {
  const tonic = def.minor ? 'i' : 'I';
  const out = [tonic];
  while (out.length < 4) {
    const next = pick(
      rng,
      def.palette.filter((c) => c !== out[out.length - 1]),
    );
    out.push(next);
  }
  return out;
}

export const generateProgression: Generator = (level: Level, rng, opts) => {
  const def = pick(rng, LEVELS[level]);
  const chords = chance(rng, def.randomShare) ? randomProgression(rng, def) : pick(rng, def.curated);
  const tonicPc = opts?.fixedRoot ? 0 : randInt(rng, 0, 11);
  const voiced = voiceChords(
    tonicPc,
    chords.map((c) => NUMERALS[c]),
  );

  const keyName = t(def.minor ? 'key.minor' : 'key.major', { tonic: noteLabel(tonicName(tonicPc, def.minor)) });
  const label = chords.join(' – ');
  return {
    kind: 'slots',
    prompt: t('q.prog.prompt', { mode: t(def.minor ? 'word.minor' : 'word.major') }),
    context: cadencePlayback(tonicPc, def.minor),
    main: chordsPlayback(voiced, 2),
    palette: def.palette.map((c) => ({ value: c, label: c })),
    answer: chords,
    item: label,
    explanation: t('q.prog.explain', { prog: label, key: keyName }),
    learnTopic: 'harmony',
  };
};
