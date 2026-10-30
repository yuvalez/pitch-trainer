import { Chord, Note, Scale } from 'tonal';

/** A sounding event. Times are in beats so playback follows the tempo setting. */
export interface PlayEvent {
  midi: number[];
  start: number;
  dur: number;
}
export type Playback = PlayEvent[];

/** A chord relative to a key: root in semitones above the tonic, intervals above that root. */
export interface ChordSpec {
  root: number;
  intervals: number[];
}

export const MAJ = [0, 4, 7];
export const MIN = [0, 3, 7];
export const DIM = [0, 3, 6];
export const AUG = [0, 4, 8];
export const DOM7 = [0, 4, 7, 10];

export const pc = (m: number) => ((m % 12) + 12) % 12;

const MAJOR_KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** Conventional spelling of a key's tonic ("major-ish" keys favour flats, minor-ish keys use C#, G#). */
export function tonicName(tonicPc: number, minorish = false): string {
  return (minorish ? MINOR_KEY_NAMES : MAJOR_KEY_NAMES)[pc(tonicPc)];
}

/** Whether a key is conventionally written with sharps (G, D, A, E, B, F# major; E, B, F#, C#, G# minor). */
export function keyUsesSharps(tonicPc: number, minorish = false): boolean {
  const sharpKeys = minorish ? [4, 11, 6, 1, 8] : [7, 2, 9, 4, 11, 6];
  return sharpKeys.includes(pc(tonicPc));
}

export function midiName(m: number, sharps = false): string {
  return sharps ? Note.fromMidiSharps(m) : Note.fromMidi(m);
}

export function pcName(m: number, sharps = false): string {
  return Note.pitchClass(midiName(m, sharps));
}

/** Spelled interval, e.g. ("Db4", "3m") -> "Fb4". */
export function transposeName(name: string, interval: string): string {
  return Note.transpose(name, interval);
}

export function scaleNoteNames(tonic: string, tonalScaleName: string): string[] {
  return Scale.get(`${tonic} ${tonalScaleName}`).notes;
}

export function chordNoteNames(root: string, symbol: string): string[] {
  return Chord.getChord(symbol, root).notes;
}

/** Midi note for a (possibly negative or >7) scale degree index. */
export function degreeToMidi(tonicMidi: number, scale: readonly number[], degree: number): number {
  const n = scale.length;
  const octave = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return tonicMidi + octave * 12 + scale[idx];
}

/** Triad built by stacking thirds on a scale degree (1-based). */
export function triadOnDegree(scale: readonly number[], degree: number): ChordSpec {
  const i = degree - 1;
  const notes = [0, 2, 4].map((k) => degreeToMidi(0, scale, i + k));
  return { root: notes[0], intervals: notes.map((n) => n - notes[0]) };
}

export function qualityOf(intervals: readonly number[]): 'maj' | 'min' | 'dim' | 'aug' | 'other' {
  const key = intervals.slice(0, 3).join(',');
  if (key === '0,4,7') return 'maj';
  if (key === '0,3,7') return 'min';
  if (key === '0,3,6') return 'dim';
  if (key === '0,4,8') return 'aug';
  return 'other';
}

function closeVoicings(pcs: number[]): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (let low = 55; low <= 66; low++) {
      if (pc(low) !== order[0]) continue;
      const notes = [low];
      for (const p of order.slice(1)) {
        let n = notes[notes.length - 1] + 1;
        while (pc(n) !== p) n++;
        notes.push(n);
      }
      out.push(notes);
    }
  }
  return out;
}

function movement(a: number[], b: number[]): number {
  return a.reduce((sum, n) => sum + Math.min(...b.map((m) => Math.abs(m - n))), 0);
}

/**
 * Voice a progression: a bass note (E2–Eb3) plus close-position upper voices
 * chosen to move as little as possible from chord to chord.
 */
export function voiceChords(tonicPc: number, chords: ChordSpec[]): number[][] {
  let prev: number[] | null = null;
  return chords.map((c) => {
    const rootPc = pc(tonicPc + c.root);
    const bass = 40 + pc(rootPc - 4);
    const upper = [...new Set(c.intervals.map((i) => pc(rootPc + i)))];
    const cands = closeVoicings(upper);
    const target = prev;
    const best = cands.reduce((a, b) => {
      const score = (v: number[]) =>
        target ? movement(v, target) : Math.abs(v.reduce((s, n) => s + n, 0) / v.length - 64);
      return score(b) < score(a) ? b : a;
    });
    prev = best;
    return [bass, ...best];
  });
}

export function chordsPlayback(voiced: number[][], beatsEach: number): Playback {
  return voiced.map((midi, i) => ({ midi, start: i * beatsEach, dur: beatsEach }));
}

export function melodyPlayback(notes: number[], beat = 1): Playback {
  return notes.map((m, i) => ({
    midi: [m],
    start: i * beat,
    dur: i === notes.length - 1 ? beat * 2 : beat,
  }));
}

export function playbackLength(pb: Playback): number {
  return pb.reduce((end, e) => Math.max(end, e.start + e.dur), 0);
}

/** Play `b` after `a`, separated by `gap` beats. */
export function concatPlayback(a: Playback, b: Playback, gap = 1): Playback {
  const offset = a.length ? playbackLength(a) + gap : 0;
  return [...a, ...b.map((e) => ({ ...e, start: e.start + offset }))];
}

/** I–IV–V–I (or i–iv–V–i) to establish a key before an exercise. */
export function cadencePlayback(tonicPc: number, minor: boolean): Playback {
  const chords: ChordSpec[] = minor
    ? [
        { root: 0, intervals: MIN },
        { root: 5, intervals: MIN },
        { root: 7, intervals: MAJ },
        { root: 0, intervals: MIN },
      ]
    : [
        { root: 0, intervals: MAJ },
        { root: 5, intervals: MAJ },
        { root: 7, intervals: MAJ },
        { root: 0, intervals: MAJ },
      ];
  return chordsPlayback(voiceChords(tonicPc, chords), 1);
}

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
export const HARMONIC_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 11];
