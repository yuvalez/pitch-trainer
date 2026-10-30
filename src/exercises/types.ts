import type { Playback } from '../theory/music';
import type { Rng } from '../theory/random';

export type ExerciseId =
  | 'intervals'
  | 'chords'
  | 'chordName'
  | 'chordNotes'
  | 'chordContext'
  | 'keyId'
  | 'dictation'
  | 'progressions';
export type Level = 0 | 1 | 2 | 3;
export const LEVELS: Level[] = [0, 1, 2, 3];

export interface Choice {
  value: string;
  label: string;
}

interface QuestionBase {
  prompt: string;
  /** Optional key-establishing cadence played before `main`. */
  context?: Playback;
  main: Playback;
  /** Human-readable label of what was tested, used for "weakest items" stats. */
  item: string;
  explanation: string;
  /** Anchor on the Learn page that explains this topic. */
  learnTopic: string;
  /** An optional on-demand reference sound, e.g. "Hear C". */
  reference?: { label: string; playback: Playback };
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  choices: Choice[];
  answer: string;
  /** For "which chord is #n" questions: the target position and the chord on its own. */
  highlight?: { index: number; count: number; alone: Playback };
}

/** Name a chord's root and quality. */
export interface ChordNameQuestion extends QuestionBase {
  kind: 'chordName';
  qualities: Choice[];
  /** Allowed roots; values are pitch classes as strings. */
  rootChoices: Choice[];
  answer: { rootPc: number; type: string };
  /** Chord name to show, e.g. "Dm7". */
  answerName: string;
  pianoRange: [number, number];
}

/** Play the chord's notes on the piano. Graded by pitch class, so any octave counts. */
export interface ChordNotesQuestion extends QuestionBase {
  kind: 'chordNotes';
  /** Chord notes, lowest (bass) first. */
  answer: number[];
  /** Notes pre-selected for the user. */
  given: number[];
  /** The lowest selected note must match the bass (inversions). */
  requireBass: boolean;
  sharps: boolean;
  answerName: string;
  pianoRange: [number, number];
}

/** Fill a row of slots from a palette (chord progressions). */
export interface SlotsQuestion extends QuestionBase {
  kind: 'slots';
  palette: Choice[];
  answer: string[];
}

/** Find the tonic on the piano and name the mode. */
export interface KeyQuestion extends QuestionBase {
  kind: 'key';
  askTonic: boolean;
  modes: Choice[];
  answer: { tonicPc: number; mode: string };
  /** Tonic spelled for this key, e.g. "F#" or "Db". */
  tonicName: string;
  pianoRange: [number, number];
}

/** Play the melody back on the piano. The first `given` notes are revealed. */
export interface DictationQuestion extends QuestionBase {
  kind: 'dictation';
  answer: number[];
  given: number;
  /** Spell note names with sharps (true for sharp keys). */
  sharps: boolean;
  pianoRange: [number, number];
}

export type Question =
  | ChoiceQuestion
  | SlotsQuestion
  | KeyQuestion
  | DictationQuestion
  | ChordNameQuestion
  | ChordNotesQuestion;

export type UserAnswer =
  | { kind: 'choice'; value: string }
  | { kind: 'slots'; values: string[] }
  | { kind: 'key'; tonicPc: number | null; mode: string }
  | { kind: 'dictation'; notes: number[] }
  | { kind: 'chordName'; rootPc: number | null; type: string | null }
  | { kind: 'chordNotes'; notes: number[] };

export interface GenerateOptions {
  /** Keep the root/tonic on C to practice without transposition. */
  fixedRoot?: boolean;
  /** Custom practice: restrict chord exercises to these chord types. */
  chordTypes?: string[];
  /** Custom practice: invert chords. */
  inversions?: boolean;
  /** Custom practice: relative pick weight per chord type (missed types come up more). */
  weights?: Record<string, number>;
}

export type Generator = (level: Level, rng: Rng, opts?: GenerateOptions) => Question;
