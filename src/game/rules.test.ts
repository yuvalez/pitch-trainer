import { describe, expect, it } from 'vitest';
import { EXERCISE_IDS, emptyProgress, parseProgress, recordAnswer } from '../progress/store';
import { awardAchievements, newAchievements } from './achievements';
import {
  addXp,
  comboMultiplier,
  currentStreak,
  emptyGame,
  parseGame,
  rankFor,
  recordGameAnswer,
  recordRoundEnd,
  starsFor,
  xpForAnswer,
  type RoundEvent,
} from './rules';

const day = (d: number, h = 12) => new Date(2026, 9, d, h);

describe('xp and combos', () => {
  it('scales by level and combo', () => {
    expect(xpForAnswer(0, 1)).toBe(10);
    expect(xpForAnswer(3, 1)).toBe(25);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(1.5);
    expect(comboMultiplier(10)).toBe(2);
    expect(comboMultiplier(25)).toBe(3);
    expect(xpForAnswer(1, 10)).toBe(30);
  });

  it('gives stars for a finished classic round only', () => {
    expect(starsFor(0, true)).toBe(3);
    expect(starsFor(1, true)).toBe(3);
    expect(starsFor(2, true)).toBe(2);
    expect(starsFor(3, true)).toBe(2);
    expect(starsFor(4, true)).toBe(1);
    expect(starsFor(5, true)).toBe(0);
    expect(starsFor(0, false)).toBe(0);
  });
});

describe('ranks', () => {
  it('finds the rank and progress to the next', () => {
    expect(rankFor(0).index).toBe(0);
    expect(rankFor(199).index).toBe(0);
    expect(rankFor(200).index).toBe(1);
    expect(rankFor(400).progress).toBeCloseTo(0.5);
    expect(rankFor(400).toNext).toBe(200);
    const top = rankFor(99999);
    expect(top.index).toBe(7);
    expect(top.toNext).toBeNull();
  });
});

describe('daily goal and streak', () => {
  it('counts a day once the goal is reached and extends on consecutive days', () => {
    let g = emptyGame();
    g = addXp(g, 30, day(1), 50);
    expect(g.streak.count).toBe(0);
    g = addXp(g, 30, day(1), 50);
    expect(g.streak.count).toBe(1);
    g = addXp(g, 100, day(1), 50); // same day again: no double count
    expect(g.streak.count).toBe(1);
    g = addXp(g, 60, day(2), 50);
    expect(g.streak.count).toBe(2);
    expect(g.today).toEqual({ date: '2026-10-02', xp: 60 });
    expect(g.xp).toBe(220);
  });

  it('resets after a missed day but keeps the best', () => {
    let g = emptyGame();
    g = addXp(g, 50, day(1), 50);
    g = addXp(g, 50, day(2), 50);
    expect(currentStreak(g, day(3))).toBe(2); // still alive the next day
    expect(currentStreak(g, day(4))).toBe(0); // a whole day missed
    g = addXp(g, 50, day(4), 50);
    expect(g.streak.count).toBe(1);
    expect(g.streak.best).toBe(2);
  });

  it('rolls over across months', () => {
    let g = emptyGame();
    g = addXp(g, 50, new Date(2026, 9, 31, 22), 50);
    g = addXp(g, 50, new Date(2026, 10, 1, 9), 50);
    expect(g.streak.count).toBe(2);
  });
});

describe('recording', () => {
  it('tracks answers: combo, correct count, exercises played, night owl', () => {
    let g = emptyGame();
    g = recordGameAnswer(g, { id: 'chords', correct: true, xp: 10, combo: 7, now: day(1, 1), goal: 50 });
    g = recordGameAnswer(g, { id: 'intervals', correct: false, xp: 99, combo: 0, now: day(1, 12), goal: 50 });
    expect(g.xp).toBe(10);
    expect(g.bestCombo).toBe(7);
    expect(g.totalCorrect).toBe(1);
    expect(g.played).toEqual(['chords', 'intervals']);
    expect(g.last).toBe('intervals');
    expect(g.nightOwl).toBe(true);
  });

  const round = (patch: Partial<RoundEvent>): RoundEvent => ({
    id: 'chords',
    level: 1,
    mode: 'classic',
    custom: false,
    finished: true,
    mistakes: 0,
    score: 20,
    now: day(1),
    goal: 50,
    ...patch,
  });

  it('keeps the best stars per level and awards bonus xp', () => {
    let out = recordRoundEnd(emptyGame(), round({ mistakes: 2 }));
    expect(out.stars).toBe(2);
    expect(out.bonusXp).toBe(20);
    out = recordRoundEnd(out.game, round({ mistakes: 4 }));
    expect(out.game.stars.chords?.[1]).toBe(2);
    out = recordRoundEnd(out.game, round({ mistakes: 0 }));
    expect(out.game.stars.chords?.[1]).toBe(3);
    expect(out.game.perfectRounds).toBe(1);
    expect(out.game.rounds).toBe(3);
  });

  it('records arcade high scores and no stars', () => {
    let out = recordRoundEnd(emptyGame(), round({ mode: 'timeAttack', finished: false, score: 12 }));
    expect(out.stars).toBe(0);
    expect(out.newRecord).toBe(true);
    out = recordRoundEnd(out.game, round({ mode: 'timeAttack', finished: false, score: 9 }));
    expect(out.newRecord).toBe(false);
    expect(out.previousBest).toBe(12);
    expect(out.game.highScores.chords).toEqual({ timeAttack: 12, survival: 0 });
  });

  it('custom rounds earn no stars but count for the custom trophy', () => {
    const out = recordRoundEnd(emptyGame(), round({ custom: true }));
    expect(out.stars).toBe(0);
    expect(out.game.customRounds).toBe(1);
    expect(out.game.stars).toEqual({});
  });
});

describe('achievements', () => {
  it('awards each achievement once', () => {
    let p = emptyProgress();
    expect(newAchievements(p)).toEqual([]);
    p = { ...p, game: recordRoundEnd(p.game, { ...baseRound, mistakes: 0 }).game };
    const first = newAchievements(p).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['firstRound', 'perfect']));
    p = awardAchievements(p, newAchievements(p), 123);
    expect(p.game.achievements.firstRound).toBe(123);
    expect(newAchievements(p)).toEqual([]);
  });

  it('detects level-based achievements', () => {
    let p = emptyProgress();
    for (let l = 0 as 0 | 1 | 2; l < 3; l++) {
      for (let i = 0; i < 20; i++) p = recordAnswer(p, 'intervals', l, true, 'x').data;
    }
    expect(p.exercises.intervals.unlocked).toBe(3);
    expect(newAchievements(p).map((a) => a.id)).toContain('expert');
  });
});

const baseRound: RoundEvent = {
  id: 'chords',
  level: 0,
  mode: 'classic',
  custom: false,
  finished: true,
  mistakes: 0,
  score: 20,
  now: day(1),
  goal: 50,
};

describe('parsing', () => {
  it('round-trips game state and ignores junk', () => {
    let g = emptyGame();
    g = recordRoundEnd(g, baseRound).game;
    g = recordRoundEnd(g, { ...baseRound, mode: 'survival', finished: false, score: 7 }).game;
    g = { ...g, achievements: { perfect: 5 } };
    expect(parseGame(JSON.parse(JSON.stringify(g)), EXERCISE_IDS)).toEqual(g);
    const junk = parseGame(
      { xp: -5, stars: { chords: { 0: 9, 1: 2 }, nope: { 0: 3 } }, played: ['chords', 'zzz'], last: 'zzz' },
      EXERCISE_IDS,
    );
    expect(junk.xp).toBe(0);
    expect(junk.stars).toEqual({ chords: { 1: 2 } });
    expect(junk.played).toEqual(['chords']);
    expect(junk.last).toBeNull();
  });

  it('loads saves without game data or new settings', () => {
    const p = parseProgress(JSON.stringify({ version: 1, settings: { tempo: 80 } }));
    expect(p.game).toEqual(emptyGame());
    expect(p.settings.theme).toBe('system');
    expect(p.settings.noteNames).toBe('auto');
    expect(p.settings.dailyGoal).toBe(50);
    const bad = parseProgress(JSON.stringify({ version: 1, settings: { theme: 'neon', lang: 'fr', dailyGoal: 7 } }));
    expect(bad.settings.theme).toBe('system');
    expect(['en', 'he']).toContain(bad.settings.lang);
    expect(bad.settings.dailyGoal).toBe(50);
    const good = parseProgress(JSON.stringify({ version: 1, settings: { theme: 'dark', lang: 'he', noteNames: 'letters', sfx: false, dailyGoal: 200 } }));
    expect(good.settings).toMatchObject({ theme: 'dark', lang: 'he', noteNames: 'letters', sfx: false, dailyGoal: 200 });
  });
});
