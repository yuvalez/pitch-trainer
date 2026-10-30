import { generateChordContext } from './chordContext';
import { generateChordName } from './chordName';
import { generateChordNotes } from './chordNotes';
import { generateChord } from './chords';
import { generateDictation } from './dictation';
import { generateInterval } from './intervals';
import { generateKeyId } from './keyId';
import { generateProgression } from './progressions';
import type { ExerciseId, Generator } from './types';

export const GENERATORS: Record<ExerciseId, Generator> = {
  intervals: generateInterval,
  chords: generateChord,
  chordName: generateChordName,
  chordNotes: generateChordNotes,
  chordContext: generateChordContext,
  keyId: generateKeyId,
  dictation: generateDictation,
  progressions: generateProgression,
};
