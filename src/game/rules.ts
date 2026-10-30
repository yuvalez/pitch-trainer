import { LEVELS, type ExerciseId, type Level } from '../exercises/types';

export type PlayMode = 'classic' | 'timeAttack' | 'survival';
export type Stars = 0 | 1 | 2 | 3;

export const CLASSIC_LENGTH = 20;
export const CLASSIC_HEARTS = 5;
export const SURVIVAL_HEARTS = 3;
export const TIME_ATTACK_SECONDS = 60;
export const DAILY_GOALS = [30, 50, 100, 200] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export interface GameState {
  xp: number;
  /** XP earned on `date` (local YYYY-MM-DD). */
  today: { date: string; xp: number };
  /** Consecutive days the daily goal was reached, ending on `lastDay`. */
  streak: { count: number; best: number; lastDay: string };
  bestCombo: number;
  totalCorrect: number;
  rounds: number;
  perfectRounds: number;
  customRounds: number;
  nightOwl: boolean;
  /** Best star rating per Classic level. */
  stars: Partial<Record<ExerciseId, Partial<Record<Level, Stars>>>>;
  highScores: Partial<Record<ExerciseId, { timeAttack: number; survival: number }>>;
  /** Achievement id -> unlock time (ms). */
  achievements: Record<string, number>;
  played: ExerciseId[];
  last: ExerciseId | null;
}

export function emptyGame(): GameState {
  return {
    xp: 0,
    today: { date: '', xp: 0 },
    streak: { count: 0, best: 0, lastDay: '' },
    bestCombo: 0,
    totalCorrect: 0,
    rounds: 0,
    perfectRounds: 0,
    customRounds: 0,
    nightOwl: false,
    stars: {},
    highScores: {},
    achievements: {},
    played: [],
    last: null,
  };
}

// ---- XP & combos -------------------------------------------------------------

const LEVEL_XP = [10, 15, 20, 25];

/** Combo multiplier for the given run of correct answers (including the current one). */
export function comboMultiplier(combo: number): number {
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1.5;
  return 1;
}

export function xpForAnswer(level: Level, combo: number): number {
  return Math.round(LEVEL_XP[level] * comboMultiplier(combo));
}

export const STAR_BONUS_XP = 10;

/** Classic stars from mistakes in a finished round: 0–1 ★★★, 2–3 ★★, 4 ★. */
export function starsFor(mistakes: number, finished: boolean): Stars {
  if (!finished) return 0;
  if (mistakes <= 1) return 3;
  if (mistakes <= 3) return 2;
  if (mistakes < CLASSIC_HEARTS) return 1;
  return 0;
}

// ---- Ranks -------------------------------------------------------------------

export const RANKS = [
  { xp: 0, icon: '👂' },
  { xp: 200, icon: '🎵' },
  { xp: 600, icon: '🎸' },
  { xp: 1500, icon: '🎹' },
  { xp: 3500, icon: '🥁' },
  { xp: 7000, icon: '🎻' },
  { xp: 12000, icon: '🎼' },
  { xp: 20000, icon: '🏆' },
] as const;

export interface RankInfo {
  index: number;
  icon: string;
  /** XP still needed for the next rank, or null at the top. */
  toNext: number | null;
  /** 0–1 progress from this rank to the next. */
  progress: number;
}

export function rankFor(xp: number): RankInfo {
  let index = 0;
  while (index + 1 < RANKS.length && xp >= RANKS[index + 1].xp) index++;
  const cur = RANKS[index];
  const next = RANKS[index + 1];
  return {
    index,
    icon: cur.icon,
    toNext: next ? next.xp - xp : null,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
  };
}

// ---- Daily goal & streak -------------------------------------------------------

export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** XP earned today (0 if the stored day is not today). */
export function xpToday(g: GameState, now: Date): number {
  return g.today.date === dayKey(now) ? g.today.xp : 0;
}

/** The streak as it stands now: it lapses once a whole day passes without reaching the goal. */
export function currentStreak(g: GameState, now: Date): number {
  const today = dayKey(now);
  return g.streak.lastDay === today || g.streak.lastDay === previousDay(today) ? g.streak.count : 0;
}

/** Add XP, rolling the daily counter over and extending the streak when the goal is reached. */
export function addXp(g: GameState, xp: number, now: Date, goal: number): GameState {
  const date = dayKey(now);
  const before = g.today.date === date ? g.today.xp : 0;
  const after = before + xp;
  let streak = g.streak;
  if (before < goal && after >= goal && g.streak.lastDay !== date) {
    const count = g.streak.lastDay === previousDay(date) ? g.streak.count + 1 : 1;
    streak = { count, best: Math.max(g.streak.best, count), lastDay: date };
  }
  return { ...g, xp: g.xp + xp, today: { date, xp: after }, streak };
}

// ---- Recording -----------------------------------------------------------------

export interface AnswerEvent {
  id: ExerciseId;
  correct: boolean;
  xp: number;
  combo: number;
  now: Date;
  goal: number;
}

export function recordGameAnswer(g: GameState, e: AnswerEvent): GameState {
  const next = addXp(g, e.correct ? e.xp : 0, e.now, e.goal);
  const hour = e.now.getHours();
  return {
    ...next,
    bestCombo: Math.max(g.bestCombo, e.combo),
    totalCorrect: g.totalCorrect + (e.correct ? 1 : 0),
    nightOwl: g.nightOwl || hour < 4,
    played: g.played.includes(e.id) ? g.played : [...g.played, e.id],
    last: e.id,
  };
}

export interface RoundEvent {
  id: ExerciseId;
  level: Level;
  mode: PlayMode;
  custom: boolean;
  /** Classic: the round reached the last question with hearts left. */
  finished: boolean;
  mistakes: number;
  /** Correct answers in the round. */
  score: number;
  now: Date;
  goal: number;
}

export interface RoundOutcome {
  game: GameState;
  stars: Stars;
  bonusXp: number;
  /** Arcade modes: whether the score beat the previous best, and that best. */
  newRecord: boolean;
  previousBest: number;
}

export function recordRoundEnd(g: GameState, r: RoundEvent): RoundOutcome {
  const classic = r.mode === 'classic' && !r.custom;
  const stars = classic ? starsFor(r.mistakes, r.finished) : 0;
  const bonusXp = stars * STAR_BONUS_XP;
  let next = addXp(g, bonusXp, r.now, r.goal);
  next = {
    ...next,
    rounds: g.rounds + 1,
    perfectRounds: g.perfectRounds + (classic && r.finished && r.mistakes === 0 ? 1 : 0),
    customRounds: g.customRounds + (r.custom && r.finished ? 1 : 0),
  };

  if (classic && stars > (g.stars[r.id]?.[r.level] ?? 0)) {
    next.stars = { ...g.stars, [r.id]: { ...g.stars[r.id], [r.level]: stars } };
  }

  let newRecord = false;
  let previousBest = 0;
  if (r.mode !== 'classic' && !r.custom) {
    const hs = g.highScores[r.id] ?? { timeAttack: 0, survival: 0 };
    previousBest = hs[r.mode];
    if (r.score > previousBest) {
      newRecord = true;
      next.highScores = { ...g.highScores, [r.id]: { ...hs, [r.mode]: r.score } };
    }
  }
  return { game: next, stars, bonusXp, newRecord, previousBest };
}

export function threeStarLevels(g: GameState): number {
  return Object.values(g.stars).reduce((n, lv) => n + LEVELS.filter((l) => lv?.[l] === 3).length, 0);
}

// ---- Parsing --------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function parseGame(v: unknown, ids: readonly ExerciseId[]): GameState {
  const g = emptyGame();
  if (!isObj(v)) return g;
  g.xp = num(v.xp);
  if (isObj(v.today)) g.today = { date: str(v.today.date), xp: num(v.today.xp) };
  if (isObj(v.streak)) {
    g.streak = { count: num(v.streak.count), best: num(v.streak.best), lastDay: str(v.streak.lastDay) };
  }
  g.bestCombo = num(v.bestCombo);
  g.totalCorrect = num(v.totalCorrect);
  g.rounds = num(v.rounds);
  g.perfectRounds = num(v.perfectRounds);
  g.customRounds = num(v.customRounds);
  g.nightOwl = v.nightOwl === true;
  for (const id of ids) {
    const s = isObj(v.stars) ? v.stars[id] : undefined;
    if (isObj(s)) {
      const lv: Partial<Record<Level, Stars>> = {};
      for (const l of LEVELS) {
        const n = s[l];
        if (n === 1 || n === 2 || n === 3) lv[l] = n;
      }
      if (Object.keys(lv).length) g.stars[id] = lv;
    }
    const h = isObj(v.highScores) ? v.highScores[id] : undefined;
    if (isObj(h)) g.highScores[id] = { timeAttack: num(h.timeAttack), survival: num(h.survival) };
  }
  if (isObj(v.achievements)) {
    for (const [k, at] of Object.entries(v.achievements)) if (typeof at === 'number') g.achievements[k] = at;
  }
  if (Array.isArray(v.played)) g.played = ids.filter((id) => (v.played as unknown[]).includes(id));
  if (typeof v.last === 'string' && ids.includes(v.last as ExerciseId)) g.last = v.last as ExerciseId;
  return g;
}
