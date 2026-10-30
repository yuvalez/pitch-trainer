import { CHORD_TYPES, chordLabel } from '../exercises/chords';
import { INTERVALS, intervalLabel } from '../exercises/intervals';
import { MODES, modeLabel } from '../exercises/keyId';
import type { ExerciseId } from '../exercises/types';
import { t } from './index';

const MELODY_ITEMS: Record<string, () => string> = {
  'Major-key melodies': () => t('item.majorMelodies'),
  'Minor-key melodies': () => t('item.minorMelodies'),
  'Chromatic melodies': () => t('item.chromaticMelodies'),
};

const keyOf = (table: Record<string, { label: string }>, item: string) =>
  Object.keys(table).find((k) => table[k].label === item);

/**
 * Display text for a stats item. Items are stored under stable English names (interval, chord and
 * scale labels, which overlap, hence the exercise id); numerals and progressions show as they are.
 */
export function itemLabel(id: ExerciseId, item: string): string {
  if (id === 'intervals') {
    const k = keyOf(INTERVALS, item);
    return k ? intervalLabel(k) : item;
  }
  if (id === 'chords' || id === 'chordName' || id === 'chordNotes') {
    const k = keyOf(CHORD_TYPES, item);
    return k ? chordLabel(k) : item;
  }
  if (id === 'keyId') {
    const k = keyOf(MODES, item);
    return k ? modeLabel(k) : item;
  }
  return MELODY_ITEMS[item]?.() ?? item;
}
