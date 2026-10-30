import { t, tDyn } from '../i18n';
import type { ExerciseId, Level } from './types';

export type ExerciseGroup = 'basics' | 'chords' | 'songs';

export const GROUPS: ExerciseGroup[] = ['basics', 'chords', 'songs'];

/** Exercises that offer a Custom tab for picking chord types. */
export const CUSTOM_CHORD_EXERCISES: ExerciseId[] = ['chords', 'chordName', 'chordNotes'];

export interface ExerciseMeta {
  id: ExerciseId;
  group: ExerciseGroup;
  icon: string;
  /** Accent colour for the exercise's card and header. */
  color: string;
}

export const EXERCISES: ExerciseMeta[] = [
  { id: 'intervals', group: 'basics', icon: '📏', color: '#ff6b6b' },
  { id: 'chords', group: 'chords', icon: '🎹', color: '#845ef7' },
  { id: 'chordName', group: 'chords', icon: '🏷️', color: '#f06595' },
  { id: 'chordNotes', group: 'chords', icon: '🖐️', color: '#12b886' },
  { id: 'chordContext', group: 'chords', icon: '🧩', color: '#f59f00' },
  { id: 'keyId', group: 'songs', icon: '🔑', color: '#339af0' },
  { id: 'dictation', group: 'songs', icon: '✍️', color: '#ff922b' },
  { id: 'progressions', group: 'songs', icon: '🔁', color: '#40c057' },
];

export const levelName = (l: Level): string => t(`level.${l}`);
export const groupTitle = (g: ExerciseGroup): string => t(`group.${g}`);
export const exerciseTitle = (id: ExerciseId): string => tDyn(`ex.${id}.title`, id);
export const exerciseBlurb = (id: ExerciseId): string => tDyn(`ex.${id}.blurb`, '');
export const exerciseWhy = (id: ExerciseId): string => tDyn(`ex.${id}.why`, '');
export const levelDescription = (id: ExerciseId, l: Level): string => tDyn(`ex.${id}.lv${l}`, '');

export function exerciseMeta(id: ExerciseId): ExerciseMeta {
  const m = EXERCISES.find((e) => e.id === id);
  if (!m) throw new Error(`Unknown exercise ${id}`);
  return m;
}
