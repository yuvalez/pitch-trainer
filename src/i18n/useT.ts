import { useProgress } from '../progress/store';
import { setLanguage, t } from './index';

/** Returns `t` and re-renders the caller when the language or note-name setting changes. */
export function useT(): typeof t {
  const { settings } = useProgress();
  setLanguage(settings.lang, settings.noteNames);
  return t;
}
