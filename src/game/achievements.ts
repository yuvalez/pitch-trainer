import { LEVELS } from '../exercises/types';
import { EXERCISE_IDS, isMastered, type ProgressData } from '../progress/store';
import { threeStarLevels } from './rules';

export interface Achievement {
  /** Also the i18n key: `ach.<id>` and `ach.<id>.desc`. */
  id: string;
  icon: string;
  check: (p: ProgressData) => boolean;
}

const CHORD_EXERCISES = ['chords', 'chordName', 'chordNotes', 'chordContext'] as const;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstRound', icon: '🎬', check: (p) => p.game.rounds >= 1 },
  { id: 'perfect', icon: '💯', check: (p) => p.game.perfectRounds >= 1 },
  { id: 'streak3', icon: '🔥', check: (p) => p.game.streak.best >= 3 },
  { id: 'streak7', icon: '📅', check: (p) => p.game.streak.best >= 7 },
  { id: 'streak30', icon: '🌋', check: (p) => p.game.streak.best >= 30 },
  { id: 'combo10', icon: '⚡', check: (p) => p.game.bestCombo >= 10 },
  { id: 'combo25', icon: '🌩️', check: (p) => p.game.bestCombo >= 25 },
  { id: 'combo50', icon: '🚀', check: (p) => p.game.bestCombo >= 50 },
  { id: 'correct100', icon: '🎯', check: (p) => p.game.totalCorrect >= 100 },
  { id: 'correct1000', icon: '🛡️', check: (p) => p.game.totalCorrect >= 1000 },
  { id: 'expert', icon: '🔓', check: (p) => EXERCISE_IDS.some((id) => p.exercises[id].unlocked === 3) },
  {
    id: 'mastered',
    icon: '👑',
    check: (p) => EXERCISE_IDS.some((id) => LEVELS.every((l) => isMastered(p.exercises[id].levels[l]))),
  },
  { id: 'chordWizard', icon: '🧙', check: (p) => CHORD_EXERCISES.every((id) => p.exercises[id].unlocked >= 2) },
  { id: 'stars10', icon: '⭐', check: (p) => threeStarLevels(p.game) >= 10 },
  { id: 'speed', icon: '⏱️', check: (p) => Object.values(p.game.highScores).some((h) => (h?.timeAttack ?? 0) >= 15) },
  { id: 'survivor', icon: '🏝️', check: (p) => Object.values(p.game.highScores).some((h) => (h?.survival ?? 0) >= 25) },
  { id: 'explorer', icon: '🧭', check: (p) => EXERCISE_IDS.every((id) => p.game.played.includes(id)) },
  { id: 'custom', icon: '🎛️', check: (p) => p.game.customRounds >= 1 },
  { id: 'nightOwl', icon: '🦉', check: (p) => p.game.nightOwl },
  { id: 'bandleader', icon: '🥁', check: (p) => p.game.xp >= 3500 },
];

/** Achievements whose condition now holds but that haven't been awarded yet. */
export function newAchievements(p: ProgressData): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !(a.id in p.game.achievements) && a.check(p));
}

/** Mark achievements as unlocked at `at`. */
export function awardAchievements(p: ProgressData, list: Achievement[], at: number): ProgressData {
  if (!list.length) return p;
  const achievements = { ...p.game.achievements };
  for (const a of list) achievements[a.id] = at;
  return { ...p, game: { ...p.game, achievements } };
}
