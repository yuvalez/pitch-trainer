import { getLang, usesSolfege } from './index';

const LETTERS = 'CDEFGAB';
const SOLFEGE = {
  en: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
  he: ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'],
};

/**
 * Display form of a letter note name ("C", "F#", "Bb4"). Theory code always works with letters;
 * this converts to solfège ("Do", "דו♯") when that setting is active.
 */
export function noteLabel(name: string): string {
  if (!usesSolfege()) return name;
  const m = /^([A-G])(##|bb|#|b|♯|♭)?(-?\d+)?$/.exec(name);
  if (!m) return name;
  const acc = (m[2] ?? '').replace(/#/g, '♯').replace(/b/g, '♭');
  return SOLFEGE[getLang()][LETTERS.indexOf(m[1])] + acc + (m[3] ?? '');
}

/** Converts a space-separated list such as "C E G". */
export const notesLabel = (names: string): string => names.split(' ').map(noteLabel).join(' ');
