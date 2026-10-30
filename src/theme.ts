import { useEffect } from 'react';
import type { Settings } from './progress/store';

/** Reflect theme and language settings on <html>: data-theme (unset = follow the system), lang and dir. */
export function useDocumentSettings(settings: Settings): void {
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.lang;
    root.dir = settings.lang === 'he' ? 'rtl' : 'ltr';
  }, [settings.lang]);
}

export const THEME_ORDER: Settings['theme'][] = ['system', 'light', 'dark'];
export const THEME_ICONS: Record<Settings['theme'], string> = { system: '🌓', light: '☀️', dark: '🌙' };
