import { describe, expect, it } from 'vitest';
import {
  chordWeights,
  emptyProgress,
  isMastered,
  parseProgress,
  recentAccuracy,
  recordAnswer,
  recordItemOnly,
  type ProgressData,
} from './store';

function answer(data: ProgressData, results: boolean[], level: 0 | 1 | 2 | 3 = 0) {
  let unlockedAt: number | null = null;
  results.forEach((r, i) => {
    const res = recordAnswer(data, 'intervals', level, r, 'Major 3rd');
    data = res.data;
    if (res.newlyUnlocked !== null && unlockedAt === null) unlockedAt = i + 1;
  });
  return { data, unlockedAt };
}

describe('progress', () => {
  it('unlocks the next level after 20 answers at 80%', () => {
    const results = Array.from({ length: 20 }, (_, i) => i % 5 !== 0); // 16/20
    const { data, unlockedAt } = answer(emptyProgress(), results);
    expect(unlockedAt).toBe(20);
    expect(data.exercises.intervals.unlocked).toBe(1);
  });

  it('does not unlock below threshold or with too few answers', () => {
    expect(answer(emptyProgress(), Array(19).fill(true)).unlockedAt).toBeNull();
    const below = Array.from({ length: 20 }, (_, i) => i % 4 !== 0); // 15/20
    expect(answer(emptyProgress(), below).data.exercises.intervals.unlocked).toBe(0);
  });

  it('does not unlock from practice on a level other than the current one', () => {
    const { data } = answer(emptyProgress(), Array(20).fill(true), 2);
    expect(data.exercises.intervals.unlocked).toBe(0);
  });

  it('tracks streaks, totals and items', () => {
    const { data } = answer(emptyProgress(), [true, true, false, true]);
    const s = data.exercises.intervals.levels[0]!;
    expect(s.total).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.bestStreak).toBe(2);
    expect(s.streak).toBe(1);
    expect(data.exercises.intervals.items['Major 3rd']).toEqual({ seen: 4, correct: 3 });
    expect(recentAccuracy(s)).toBe(0.75);
    expect(isMastered(s)).toBe(false);
  });

  it('round-trips through JSON', () => {
    const { data } = answer(emptyProgress(), Array(25).fill(true));
    expect(parseProgress(JSON.stringify(data))).toEqual(data);
  });

  it('recovers from corrupted storage', () => {
    expect(parseProgress('{not json')).toEqual(emptyProgress());
    expect(parseProgress('null')).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: 99 }))).toEqual(emptyProgress());
    const partial = parseProgress(
      JSON.stringify({
        version: 1,
        exercises: { chords: { unlocked: 7, levels: { 0: { history: 'x' } }, items: { a: 1 } } },
        settings: { tempo: 9999, instrument: 'kazoo' },
      }),
    );
    expect(partial.exercises.chords.unlocked).toBe(0);
    expect(partial.exercises.chords.levels).toEqual({});
    expect(partial.settings.tempo).toBe(160);
    expect(partial.settings.instrument).toBe('piano');
  });

  it('custom practice records items without touching levels or unlocks', () => {
    let data = emptyProgress();
    for (let i = 0; i < 30; i++) data = recordItemOnly(data, 'chordName', true, 'Major 7th');
    expect(data.exercises.chordName.levels).toEqual({});
    expect(data.exercises.chordName.unlocked).toBe(0);
    expect(data.exercises.chordName.items['Major 7th']).toEqual({ seen: 30, correct: 30 });
  });

  it('weights missed chord types more heavily', () => {
    let data = emptyProgress();
    for (let i = 0; i < 4; i++) data = recordItemOnly(data, 'chords', i < 1, 'Dominant 7th');
    data = recordItemOnly(data, 'chords', true, 'Major 7th');
    const w = chordWeights(data, 'chords', ['maj7', 'dom7', 'm7']);
    expect(w.maj7).toBe(1);
    expect(w.m7).toBe(1);
    expect(w.dom7).toBeCloseTo(1 + 3 * 0.75);
  });

  it('keeps and validates the custom chord selection', () => {
    const data = emptyProgress();
    data.settings.customChords = { types: ['maj7', 'dom7'], inversions: true };
    expect(parseProgress(JSON.stringify(data)).settings.customChords).toEqual({ types: ['maj7', 'dom7'], inversions: true });
    const bad = parseProgress(JSON.stringify({ version: 1, settings: { customChords: { types: ['maj7', 'kazoo'] } } }));
    expect(bad.settings.customChords.types).toEqual(['maj', 'min', 'dim', 'aug']);
  });

  it('loads old saves that predate the chord exercises', () => {
    const old = { version: 1, exercises: { intervals: { unlocked: 2, levels: {}, items: {} } }, settings: { tempo: 80 } };
    const p = parseProgress(JSON.stringify(old));
    expect(p.exercises.intervals.unlocked).toBe(2);
    expect(p.exercises.chordNotes.unlocked).toBe(0);
    expect(p.settings.customChords.types.length).toBeGreaterThanOrEqual(2);
  });
});
