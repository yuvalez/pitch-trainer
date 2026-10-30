import { describe, expect, it } from 'vitest';
import { pc } from '../theory/music';
import { chordName } from './chords';
import { seededRng } from '../theory/random';
import { correctAnswer, grade } from './grade';
import { GENERATORS } from './index';
import { LEVELS, type ExerciseId, type Question, type UserAnswer } from './types';

const IDS = Object.keys(GENERATORS) as ExerciseId[];
const SEEDS = 300;

function wrongAnswer(q: Question): UserAnswer {
  switch (q.kind) {
    case 'choice':
      return { kind: 'choice', value: q.choices.find((c) => c.value !== q.answer)!.value };
    case 'slots':
      return { kind: 'slots', values: q.answer.map((v) => q.palette.find((p) => p.value !== v)!.value) };
    case 'key':
      return { kind: 'key', tonicPc: q.answer.tonicPc, mode: q.modes.find((m) => m.value !== q.answer.mode)!.value };
    case 'dictation':
      return { kind: 'dictation', notes: q.answer.map((n) => n + 1) };
    case 'chordName':
      return { kind: 'chordName', rootPc: (q.answer.rootPc + 1) % 12, type: q.answer.type };
    case 'chordNotes':
      return { kind: 'chordNotes', notes: q.answer.slice(1) };
  }
}

describe.each(IDS)('%s generator', (id) => {
  it.each(LEVELS)('level %i produces valid, gradable questions', (level) => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = GENERATORS[id](level, seededRng(seed * 7919 + level));

      expect(q.main.length).toBeGreaterThan(0);
      for (const e of [...(q.context ?? []), ...q.main]) {
        for (const m of e.midi) {
          expect(Number.isInteger(m)).toBe(true);
          expect(m).toBeGreaterThanOrEqual(28);
          expect(m).toBeLessThanOrEqual(96);
        }
        expect(e.dur).toBeGreaterThan(0);
        expect(e.start).toBeGreaterThanOrEqual(0);
      }
      expect(q.item).toBeTruthy();
      expect(q.explanation).not.toMatch(/undefined|NaN/);

      if (q.kind === 'choice') expect(q.choices.map((c) => c.value)).toContain(q.answer);
      if (q.kind === 'slots') for (const v of q.answer) expect(q.palette.map((p) => p.value)).toContain(v);
      if (q.kind === 'key') expect(q.modes.map((m) => m.value)).toContain(q.answer.mode);
      if (q.kind === 'chordName') {
        expect(q.qualities.map((c) => c.value)).toContain(q.answer.type);
        expect(q.rootChoices.map((c) => c.value)).toContain(String(q.answer.rootPc));
        expect(q.answerName).not.toMatch(/undefined/);
      }
      if (q.kind === 'chordNotes') {
        for (const n of q.answer) {
          expect(n).toBeGreaterThanOrEqual(q.pianoRange[0]);
          expect(n).toBeLessThanOrEqual(q.pianoRange[1]);
        }
      }
      if (q.kind === 'choice' && q.highlight) {
        expect(q.highlight.index).toBeGreaterThanOrEqual(0);
        expect(q.highlight.index).toBeLessThan(q.highlight.count);
      }
      if (q.kind === 'dictation') {
        for (const n of q.answer) {
          expect(n).toBeGreaterThanOrEqual(q.pianoRange[0]);
          expect(n).toBeLessThanOrEqual(q.pianoRange[1]);
        }
        for (let i = 1; i < q.answer.length; i++) expect(q.answer[i]).not.toBe(q.answer[i - 1]);
      }

      expect(grade(q, correctAnswer(q)).correct).toBe(true);
      expect(grade(q, wrongAnswer(q)).correct).toBe(false);
    }
  });
});

describe('difficulty scaling', () => {
  it('beginner intervals only ascend through five intervals', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) {
      const q = GENERATORS.intervals(0, seededRng(s));
      if (q.kind !== 'choice') throw new Error();
      seen.add(q.answer);
      expect(q.main[0].midi[0]).toBeLessThan(q.main[1].midi[0]);
    }
    expect([...seen].sort()).toEqual(['2M', '3M', '4P', '5P', '8P']);
  });

  it('dictation lengths grow with level', () => {
    const lengths = LEVELS.map((lv) => {
      const q = GENERATORS.dictation(lv, seededRng(1));
      return q.kind === 'dictation' ? q.answer.length : 0;
    });
    expect(lengths[0]).toBe(3);
    expect(lengths[3]).toBe(8);
    expect(lengths[1]).toBeGreaterThanOrEqual(4);
  });

  it('beginner key ID does not ask for the tonic, expert offers 8 scales', () => {
    const b = GENERATORS.keyId(0, seededRng(3));
    const e = GENERATORS.keyId(3, seededRng(3));
    if (b.kind !== 'key' || e.kind !== 'key') throw new Error();
    expect(b.askTonic).toBe(false);
    expect(e.modes).toHaveLength(8);
  });

  it('key ID grades the tonic by pitch class in any octave', () => {
    const q = GENERATORS.keyId(1, seededRng(11));
    if (q.kind !== 'key') throw new Error();
    const r = grade(q, { kind: 'key', tonicPc: 48 + q.answer.tonicPc + 12, mode: q.answer.mode });
    expect(r.correct).toBe(true);
    const wrongTonic = grade(q, { kind: 'key', tonicPc: pc(q.answer.tonicPc + 1), mode: q.answer.mode });
    expect(wrongTonic.correct).toBe(false);
  });

  it('fixed root keeps beginner intervals on middle C', () => {
    for (let s = 0; s < 50; s++) {
      const q = GENERATORS.intervals(0, seededRng(s), { fixedRoot: true });
      expect(q.main[0].midi[0]).toBe(60);
    }
  });
});

describe('chord training', () => {
  it('names chords', () => {
    expect(chordName(2, 'm7')).toBe('Dm7');
    expect(chordName(6, 'dim', true)).toBe('F#°');
    expect(chordName(10, 'maj7')).toBe('Bbmaj7');
    expect(chordName(7, 'dom7')).toBe('G7');
    expect(chordName(0, 'maj')).toBe('C');
  });

  it('grades chord notes by pitch class in any octave', () => {
    const q = GENERATORS.chordNotes(1, seededRng(5));
    if (q.kind !== 'chordNotes') throw new Error();
    const moved = q.answer.map((n, i) => (i === 0 ? n + 12 : n - 12));
    expect(grade(q, { kind: 'chordNotes', notes: moved }).correct).toBe(true);
    const extra = grade(q, { kind: 'chordNotes', notes: [...q.answer, q.answer[0] + 1] });
    expect(extra.correct).toBe(false);
    expect(extra.detail).toMatch(/Not in the chord/);
  });

  it('requires the right bass note at expert level', () => {
    for (let s = 0; s < 100; s++) {
      const q = GENERATORS.chordNotes(3, seededRng(s));
      if (q.kind !== 'chordNotes') throw new Error();
      expect(q.requireBass).toBe(true);
      // Same pitch classes with the bass moved to the top: wrong bass unless the chord is symmetric.
      const rotated = [...q.answer.slice(1), q.answer[0] + 12];
      const r = grade(q, { kind: 'chordNotes', notes: rotated });
      if (pc(rotated[0]) !== pc(q.answer[0])) expect(r.correct).toBe(false);
    }
  });

  it('custom chord types restrict what is asked and weights bias the pick', () => {
    const counts: Record<string, number> = { maj7: 0, dom7: 0 };
    for (let s = 0; s < 400; s++) {
      for (const id of ['chords', 'chordName', 'chordNotes'] as const) {
        const q = GENERATORS[id](1, seededRng(s), { chordTypes: ['maj7', 'dom7'], weights: { maj7: 1, dom7: 4 } });
        const type = q.kind === 'choice' ? q.answer : q.kind === 'chordName' ? q.answer.type : null;
        if (type) {
          expect(['maj7', 'dom7']).toContain(type);
          counts[type]++;
        }
        if (q.kind === 'chordNotes') expect(q.answer).toHaveLength(4);
      }
    }
    expect(counts.dom7).toBeGreaterThan(counts.maj7 * 2);
  });

  it('chord-in-context targets a non-tonic chord when possible', () => {
    for (let s = 0; s < 200; s++) {
      const q = GENERATORS.chordContext(0, seededRng(s));
      if (q.kind !== 'choice') throw new Error();
      expect(q.answer).not.toBe('I');
    }
  });
});
