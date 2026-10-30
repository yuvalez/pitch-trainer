import { t, tDyn } from '../i18n';
import { noteLabel } from '../i18n/notes';
import { midiName, transposeName } from '../theory/music';
import { pick, randInt } from '../theory/random';
import type { Generator } from './types';

interface IntervalInfo {
  semis: number;
  /** English name. Also the stable key for per-item stats; display text comes from `intervalLabel`. */
  label: string;
  /** A well-known tune that starts with this interval (ascending), to anchor memory. */
  song?: string;
}

export const INTERVALS: Record<string, IntervalInfo> = {
  '2m': { semis: 1, label: 'Minor 2nd', song: 'Jaws theme' },
  '2M': { semis: 2, label: 'Major 2nd', song: 'Happy Birthday ("Hap-py")' },
  '3m': { semis: 3, label: 'Minor 3rd', song: 'Greensleeves' },
  '3M': { semis: 4, label: 'Major 3rd', song: 'When the Saints Go Marching In' },
  '4P': { semis: 5, label: 'Perfect 4th', song: 'Here Comes the Bride' },
  '4A': { semis: 6, label: 'Tritone', song: 'The Simpsons theme' },
  '5P': { semis: 7, label: 'Perfect 5th', song: 'Star Wars main theme' },
  '6m': { semis: 8, label: 'Minor 6th', song: 'The Entertainer (3rd–4th notes)' },
  '6M': { semis: 9, label: 'Major 6th', song: 'My Bonnie Lies over the Ocean' },
  '7m': { semis: 10, label: 'Minor 7th', song: 'Star Trek original theme' },
  '7M': { semis: 11, label: 'Major 7th', song: 'Take On Me (chorus leap)' },
  '8P': { semis: 12, label: 'Octave', song: 'Somewhere Over the Rainbow' },
  '9m': { semis: 13, label: 'Minor 9th' },
  '9M': { semis: 14, label: 'Major 9th' },
  '10m': { semis: 15, label: 'Minor 10th' },
  '10M': { semis: 16, label: 'Major 10th' },
  '11P': { semis: 17, label: 'Perfect 11th' },
  '12P': { semis: 19, label: 'Perfect 12th' },
};

export const intervalLabel = (id: string): string => tDyn(`interval.${id}`, INTERVALS[id]?.label ?? id);
export const intervalSong = (id: string): string | undefined =>
  INTERVALS[id]?.song ? tDyn(`song.${id}`, INTERVALS[id].song!) : undefined;

const SIMPLE = ['2m', '2M', '3m', '3M', '4P', '5P', '6m', '6M', '7m', '7M', '8P'];
const WITH_TRITONE = ['2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M', '8P'];

export const INTERVAL_LEVELS: string[][] = [
  ['2M', '3M', '4P', '5P', '8P'],
  SIMPLE,
  WITH_TRITONE,
  [...WITH_TRITONE, '9m', '9M', '10m', '10M', '11P', '12P'],
];

type Direction = 'ascending' | 'descending' | 'harmonic';
const DIRECTIONS: Direction[][] = [
  ['ascending'],
  ['ascending', 'descending'],
  ['ascending', 'descending', 'harmonic'],
  ['ascending', 'descending', 'harmonic'],
];

export const generateInterval: Generator = (level, rng, opts) => {
  const set = INTERVAL_LEVELS[level];
  const name = pick(rng, set);
  const info = INTERVALS[name];
  const direction = pick(rng, DIRECTIONS[level]);

  let low: number;
  if (opts?.fixedRoot) low = direction === 'descending' ? 72 - info.semis : 60;
  else if (level === 3) low = randInt(rng, 48, 84 - info.semis);
  else low = randInt(rng, 55, 67);
  const high = low + info.semis;

  const main =
    direction === 'harmonic'
      ? [{ midi: [low, high], start: 0, dur: 2.5 }]
      : direction === 'ascending'
        ? [
            { midi: [low], start: 0, dur: 1 },
            { midi: [high], start: 1, dur: 1.5 },
          ]
        : [
            { midi: [high], start: 0, dur: 1 },
            { midi: [low], start: 1, dur: 1.5 },
          ];

  const lowName = noteLabel(midiName(low));
  const highName = noteLabel(transposeName(midiName(low), name));
  const notes =
    direction === 'descending' ? t('q.interval.down', { a: highName, b: lowName }) : t('q.interval.up', { a: lowName, b: highName });
  const songName = intervalSong(name);
  const song = songName ? t('q.interval.song', { song: songName }) : '';

  return {
    kind: 'choice',
    prompt: t('q.interval.prompt', { dir: t(`dir.${direction}`) }),
    main,
    choices: set.map((v) => ({ value: v, label: intervalLabel(v) })),
    answer: name,
    item: info.label,
    explanation: t('q.interval.explain', { notes, label: intervalLabel(name), semis: info.semis }) + song,
    learnTopic: 'intervals',
  };
};
