import { describe, expect, it } from 'vitest';
import { MAJOR_SCALE, degreeToMidi, pc, qualityOf, triadOnDegree, voiceChords } from './music';

describe('music theory helpers', () => {
  it('maps scale degrees across octaves', () => {
    expect(degreeToMidi(60, MAJOR_SCALE, 0)).toBe(60);
    expect(degreeToMidi(60, MAJOR_SCALE, 7)).toBe(72);
    expect(degreeToMidi(60, MAJOR_SCALE, -1)).toBe(59);
    expect(degreeToMidi(60, MAJOR_SCALE, 9)).toBe(76);
  });

  it('builds diatonic triads with the right qualities', () => {
    const q = [1, 2, 3, 4, 5, 6, 7].map((d) => qualityOf(triadOnDegree(MAJOR_SCALE, d).intervals));
    expect(q).toEqual(['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']);
  });

  it('voices chords with the correct pitch classes and smooth motion', () => {
    const I = { root: 0, intervals: [0, 4, 7] };
    const IV = { root: 5, intervals: [0, 4, 7] };
    const v = voiceChords(2, [I, IV]); // D major: D, G
    expect(pc(v[0][0])).toBe(2);
    expect(pc(v[1][0])).toBe(7);
    expect(new Set(v[1].slice(1).map(pc))).toEqual(new Set([7, 11, 2]));
    const moved = v[1].slice(1).reduce((s, n, i) => s + Math.abs(n - v[0][i + 1]), 0);
    expect(moved).toBeLessThanOrEqual(5);
  });
});
