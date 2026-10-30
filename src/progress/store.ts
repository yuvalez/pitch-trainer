import { useSyncExternalStore } from 'react';
import { CHORD_TYPES } from '../exercises/chords';
import { LEVELS, type ExerciseId, type Level } from '../exercises/types';
import { DAILY_GOALS, emptyGame, parseGame, type DailyGoal, type GameState } from '../game/rules';
import type { Lang, NoteNames } from '../i18n';

export const STORAGE_KEY = 'eartrainer.progress.v1';
export const UNLOCK_WINDOW = 20;
export const UNLOCK_THRESHOLD = 0.8;
const HISTORY_LIMIT = 50;
export const EXERCISE_IDS: ExerciseId[] = [
  'intervals',
  'chords',
  'chordName',
  'chordNotes',
  'chordContext',
  'keyId',
  'dictation',
  'progressions',
];

export interface LevelStats {
  history: boolean[];
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

export interface ItemStats {
  seen: number;
  correct: number;
}

export interface ExerciseProgress {
  levels: Partial<Record<Level, LevelStats>>;
  /** Highest level reached. Levels above it are shown as locked but stay playable. */
  unlocked: Level;
  items: Record<string, ItemStats>;
}

export interface Settings {
  tempo: number;
  instrument: 'piano' | 'synth';
  fixedRoot: boolean;
  showNoteNames: boolean;
  /** Chord types and inversion toggle for Custom practice rounds. */
  customChords: { types: string[]; inversions: boolean };
  theme: 'system' | 'light' | 'dark';
  lang: Lang;
  noteNames: NoteNames;
  /** Game sound effects (chimes for answers, combos, trophies). */
  sfx: boolean;
  dailyGoal: DailyGoal;
}

export interface ProgressData {
  version: 1;
  exercises: Record<ExerciseId, ExerciseProgress>;
  settings: Settings;
  game: GameState;
}

export const DEFAULT_SETTINGS: Settings = {
  tempo: 90,
  instrument: 'piano',
  fixedRoot: false,
  showNoteNames: true,
  customChords: { types: ['maj', 'min', 'dim', 'aug'], inversions: false },
  theme: 'system',
  lang: typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en',
  noteNames: 'auto',
  sfx: true,
  dailyGoal: 50,
};

function emptyExercise(): ExerciseProgress {
  return { levels: {}, unlocked: 0, items: {} };
}

export function emptyProgress(): ProgressData {
  return {
    version: 1,
    exercises: Object.fromEntries(EXERCISE_IDS.map((id) => [id, emptyExercise()])) as Record<
      ExerciseId,
      ExerciseProgress
    >,
    settings: { ...DEFAULT_SETTINGS, customChords: { ...DEFAULT_SETTINGS.customChords, types: [...DEFAULT_SETTINGS.customChords.types] } },
    game: emptyGame(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseLevelStats(v: unknown): LevelStats | undefined {
  if (!isObj(v) || !Array.isArray(v.history)) return undefined;
  return {
    history: v.history.filter((h): h is boolean => typeof h === 'boolean').slice(-HISTORY_LIMIT),
    total: isNum(v.total) ? v.total : 0,
    correct: isNum(v.correct) ? v.correct : 0,
    streak: isNum(v.streak) ? v.streak : 0,
    bestStreak: isNum(v.bestStreak) ? v.bestStreak : 0,
  };
}

/** Parse stored JSON defensively. Anything malformed falls back to defaults. */
export function parseProgress(raw: string | null): ProgressData {
  const base = emptyProgress();
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!isObj(data) || data.version !== 1) return base;

  if (isObj(data.exercises)) {
    for (const id of EXERCISE_IDS) {
      const ex = data.exercises[id];
      if (!isObj(ex)) continue;
      const out = base.exercises[id];
      if (isNum(ex.unlocked) && LEVELS.includes(ex.unlocked as Level)) out.unlocked = ex.unlocked as Level;
      if (isObj(ex.levels)) {
        for (const lv of LEVELS) {
          const s = parseLevelStats(ex.levels[lv]);
          if (s) out.levels[lv] = s;
        }
      }
      if (isObj(ex.items)) {
        for (const [k, v] of Object.entries(ex.items)) {
          if (isObj(v) && isNum(v.seen) && isNum(v.correct)) out.items[k] = { seen: v.seen, correct: v.correct };
        }
      }
    }
  }
  if (isObj(data.settings)) {
    const s = data.settings;
    const st = base.settings;
    if (isNum(s.tempo)) st.tempo = Math.min(160, Math.max(40, s.tempo));
    if (s.instrument === 'piano' || s.instrument === 'synth') st.instrument = s.instrument;
    if (typeof s.fixedRoot === 'boolean') st.fixedRoot = s.fixedRoot;
    if (typeof s.showNoteNames === 'boolean') st.showNoteNames = s.showNoteNames;
    if (isObj(s.customChords)) {
      const cc = s.customChords;
      const types = Array.isArray(cc.types)
        ? [...new Set(cc.types.filter((t): t is string => typeof t === 'string' && t in CHORD_TYPES))]
        : [];
      if (types.length >= 2) st.customChords.types = types;
      if (typeof cc.inversions === 'boolean') st.customChords.inversions = cc.inversions;
    }
    if (s.theme === 'system' || s.theme === 'light' || s.theme === 'dark') st.theme = s.theme;
    if (s.lang === 'en' || s.lang === 'he') st.lang = s.lang;
    if (s.noteNames === 'auto' || s.noteNames === 'letters' || s.noteNames === 'solfege') st.noteNames = s.noteNames;
    if (typeof s.sfx === 'boolean') st.sfx = s.sfx;
    if (DAILY_GOALS.includes(s.dailyGoal as DailyGoal)) st.dailyGoal = s.dailyGoal as DailyGoal;
  }
  base.game = parseGame(data.game, EXERCISE_IDS);
  return base;
}

/** Accuracy over the last `n` answers, or null when there are none. */
export function recentAccuracy(stats: LevelStats | undefined, n = UNLOCK_WINDOW): number | null {
  if (!stats || stats.history.length === 0) return null;
  const recent = stats.history.slice(-n);
  return recent.filter(Boolean).length / recent.length;
}

/** A level is mastered after a full window of answers at or above the threshold. */
export function isMastered(stats: LevelStats | undefined): boolean {
  if (!stats || stats.history.length < UNLOCK_WINDOW) return false;
  return (recentAccuracy(stats) ?? 0) >= UNLOCK_THRESHOLD;
}

export interface RecordResult {
  data: ProgressData;
  /** The level that just became available, if any. */
  newlyUnlocked: Level | null;
}

export function recordAnswer(
  data: ProgressData,
  id: ExerciseId,
  level: Level,
  correct: boolean,
  item: string,
): RecordResult {
  const ex = data.exercises[id];
  const prev = ex.levels[level] ?? { history: [], total: 0, correct: 0, streak: 0, bestStreak: 0 };
  const streak = correct ? prev.streak + 1 : 0;
  const stats: LevelStats = {
    history: [...prev.history, correct].slice(-HISTORY_LIMIT),
    total: prev.total + 1,
    correct: prev.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
  };
  const itemPrev = ex.items[item] ?? { seen: 0, correct: 0 };

  let unlocked = ex.unlocked;
  let newlyUnlocked: Level | null = null;
  if (level === ex.unlocked && level < 3 && isMastered(stats)) {
    unlocked = (level + 1) as Level;
    newlyUnlocked = unlocked;
  }

  return {
    newlyUnlocked,
    data: {
      ...data,
      exercises: {
        ...data.exercises,
        [id]: {
          levels: { ...ex.levels, [level]: stats },
          unlocked,
          items: { ...ex.items, [item]: { seen: itemPrev.seen + 1, correct: itemPrev.correct + (correct ? 1 : 0) } },
        },
      },
    },
  };
}

/** Custom practice: update per-item stats only, leaving level history and unlocks alone. */
export function recordItemOnly(data: ProgressData, id: ExerciseId, correct: boolean, item: string): ProgressData {
  const ex = data.exercises[id];
  const prev = ex.items[item] ?? { seen: 0, correct: 0 };
  return {
    ...data,
    exercises: {
      ...data.exercises,
      [id]: { ...ex, items: { ...ex.items, [item]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) } } },
    },
  };
}

/** Pick weights for custom chord practice: 1 + 3 × miss rate, so missed types repeat more. */
export function chordWeights(data: ProgressData, id: ExerciseId, types: string[]): Record<string, number> {
  const items = data.exercises[id].items;
  return Object.fromEntries(
    types.map((t) => {
      const s = items[CHORD_TYPES[t]?.label ?? t];
      const miss = s && s.seen > 0 ? 1 - s.correct / s.seen : 0;
      return [t, 1 + 3 * miss];
    }),
  );
}

// ---- Persistent store -------------------------------------------------------

function load(): ProgressData {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

let state: ProgressData | null = null;
const listeners = new Set<() => void>();

export function getProgress(): ProgressData {
  if (!state) state = load();
  return state;
}

export function setProgress(next: ProgressData): void {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota). Keep progress in memory for this session.
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, getProgress);
}

export function updateSettings(patch: Partial<Settings>): void {
  const cur = getProgress();
  setProgress({ ...cur, settings: { ...cur.settings, ...patch } });
}

/** Erases scores, XP, streaks and trophies; keeps settings. */
export function resetProgress(): void {
  setProgress({ ...emptyProgress(), settings: getProgress().settings });
}
