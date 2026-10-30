import { afterEach, describe, expect, it } from 'vitest';
import { chordName } from '../exercises/chords';
import { rootLabel } from '../exercises/chordName';
import { correctAnswer, grade } from '../exercises/grade';
import { GENERATORS } from '../exercises/index';
import { LEVELS, type ExerciseId, type Question } from '../exercises/types';
import { seededRng } from '../theory/random';
import { en } from './en';
import { he } from './he';
import { setLanguage, t, tCount, type Lang, type NoteNames } from './index';
import { itemLabel } from './items';
import { noteLabel, notesLabel } from './notes';

afterEach(() => setLanguage('en', 'auto'));

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('Hebrew uses the same placeholders as English for every key', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(he[key]), key).toEqual(placeholders(en[key]));
      expect(he[key].trim(), key).not.toBe('');
    }
  });

  it('fills parameters and picks the singular form', () => {
    setLanguage('he');
    expect(t('session.question', { n: 3, total: 20 })).toBe('שאלה 3 / 20');
    expect(tCount('player.streakDays', 1)).toBe('יום אחד');
    expect(tCount('player.streakDays', 4)).toBe('4 ימים');
  });
});

describe('note names', () => {
  it('keeps letters in English by default', () => {
    expect(noteLabel('F#')).toBe('F#');
    expect(notesLabel('C E G')).toBe('C E G');
  });

  it('uses solfège in Hebrew', () => {
    setLanguage('he');
    expect(noteLabel('C')).toBe('דו');
    expect(noteLabel('F#')).toBe('פה♯');
    expect(noteLabel('Bb')).toBe('סי♭');
    expect(noteLabel('G4')).toBe('סול4');
    expect(notesLabel('D F A C')).toBe('רה פה לה דו');
    expect(rootLabel(1)).toBe('דו♯/רה♭');
    expect(rootLabel(4)).toBe('מי');
  });

  it('follows the note-name setting in either language', () => {
    setLanguage('he', 'letters');
    expect(noteLabel('Eb')).toBe('Eb');
    expect(rootLabel(3)).toBe('D♯/E♭');
    setLanguage('en', 'solfege');
    expect(noteLabel('Eb')).toBe('Mi♭');
  });

  it('keeps chord symbols as letters', () => {
    setLanguage('he');
    expect(chordName(2, 'm7')).toBe('Dm7');
  });
});

const IDS = Object.keys(GENERATORS) as ExerciseId[];
const texts = (q: Question): string[] => {
  const out = [q.prompt, q.explanation, grade(q, correctAnswer(q)).detail];
  if (q.kind === 'choice') out.push(...q.choices.map((c) => c.label));
  if (q.kind === 'chordName') out.push(...q.qualities.map((c) => c.label), ...q.rootChoices.map((c) => c.label));
  if (q.kind === 'key') out.push(...q.modes.map((c) => c.label));
  if (q.reference) out.push(q.reference.label);
  return out;
};

describe.each<[Lang, NoteNames]>([
  ['en', 'auto'],
  ['he', 'auto'],
  ['he', 'letters'],
])('generated text in %s (%s note names)', (lang, notes) => {
  it.each(IDS)('%s has no missing translations', (id) => {
    setLanguage(lang, notes);
    for (const level of LEVELS) {
      for (let seed = 0; seed < 60; seed++) {
        const q = GENERATORS[id](level, seededRng(seed * 31 + level));
        for (const s of texts(q)) {
          expect(s, `${id} L${level}`).not.toMatch(/\{\w+\}|undefined|NaN|\b(?:q|grade|chord|scale|key|dir|inv)\.[a-zA-Z]/);
          if (lang === 'he') {
            // Hebrew text must not leak English sentences. Chord symbols, numerals and quoted song titles are fine.
            const unquoted = s.replace(/"[^"]*"/g, '');
            expect(unquoted, `${id} L${level}`).not.toMatch(/\b(?:the|and|Name|Play|Find|key of|It was)\b/);
          }
        }
        if (lang === 'he' && notes === 'auto') {
          expect(q.explanation + q.prompt, `${id} L${level}`).not.toMatch(/\b[A-G][#b]? (?:major|minor)\b/);
        }
      }
    }
  });
});

describe('stats item labels', () => {
  it('translates stored English items per exercise', () => {
    setLanguage('he');
    expect(itemLabel('intervals', 'Major 7th')).toBe('ספטימה גדולה');
    expect(itemLabel('chords', 'Major 7th')).toBe('מז׳ור 7');
    expect(itemLabel('keyId', 'Dorian')).toBe('דורי');
    expect(itemLabel('dictation', 'Minor-key melodies')).toBe('מנגינות במינור');
    expect(itemLabel('progressions', 'I – IV – V – I')).toBe('I – IV – V – I');
  });
});
