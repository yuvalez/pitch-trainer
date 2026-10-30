import { en } from './en';
import { he } from './he';

export type Lang = 'en' | 'he';
export type NoteNames = 'auto' | 'letters' | 'solfege';
export type TKey = keyof typeof en;
export type Params = Record<string, string | number>;

const DICTS: Record<Lang, Record<TKey, string>> = { en, he };

// The active language lives at module level so question generators can use it without React.
// The UI keeps it in sync with settings through `useT` (see useT.ts).
let lang: Lang = 'en';
let noteNames: NoteNames = 'auto';

export function setLanguage(l: Lang, n: NoteNames = 'auto'): void {
  lang = l;
  noteNames = n;
}

export const getLang = (): Lang => lang;
export const isRtl = (): boolean => lang === 'he';
export const usesSolfege = (): boolean => noteNames === 'solfege' || (noteNames === 'auto' && lang === 'he');

export function hasKey(key: string): key is TKey {
  return key in en;
}

export function t(key: TKey, params?: Params): string {
  const s = DICTS[lang][key] ?? en[key];
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

/** Translate a computed key such as `chord.${type}`, falling back to `fallback` if the key doesn't exist. */
export function tDyn(key: string, fallback: string, params?: Params): string {
  return hasKey(key) ? t(key, params) : fallback;
}

/** Uses the `<key>.one` variant for a count of 1 when one exists. */
export function tCount(key: TKey, n: number, params?: Params): string {
  const one = `${key}.one`;
  return n === 1 && hasKey(one) ? t(one, { n, ...params }) : t(key, { n, ...params });
}
