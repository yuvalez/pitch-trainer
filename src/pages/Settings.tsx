import { useEffect, useState } from 'react';
import { ensureAudio, isPianoReady, onPianoReady, play, setInstrument } from '../audio/player';
import { DAILY_GOALS } from '../game/rules';
import type { NoteNames } from '../i18n';
import { useT } from '../i18n/useT';
import { updateSettings, useProgress, type Settings as SettingsData } from '../progress/store';
import { cadencePlayback } from '../theory/music';
import { THEME_ICONS, THEME_ORDER } from '../theme';

const NOTE_NAMES: NoteNames[] = ['auto', 'letters', 'solfege'];

export function Settings() {
  const t = useT();
  const { settings } = useProgress();
  const [pianoReady, setPianoReady] = useState(isPianoReady());
  useEffect(() => onPianoReady(() => setPianoReady(true)), []);

  const test = async () => {
    await ensureAudio();
    setInstrument(settings.instrument);
    await play(cadencePlayback(0, false), settings.tempo);
  };

  return (
    <div>
      <h1>⚙️ {t('settings.title')}</h1>
      <div className="card form">
        <fieldset className="field">
          <legend>{t('settings.language')}</legend>
          <div className="segmented">
            {(['en', 'he'] as const).map((l) => (
              <button
                key={l}
                className={settings.lang === l ? 'active' : ''}
                aria-pressed={settings.lang === l}
                onClick={() => updateSettings({ lang: l })}
                lang={l}
              >
                {l === 'en' ? 'English' : 'עברית'}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>{t('settings.noteNames')}</legend>
          {NOTE_NAMES.map((n) => (
            <label key={n} className="radio">
              <input
                type="radio"
                name="noteNames"
                checked={settings.noteNames === n}
                onChange={() => updateSettings({ noteNames: n })}
              />
              {t(`settings.noteNames.${n}`)}
            </label>
          ))}
        </fieldset>

        <fieldset className="field">
          <legend>{t('settings.theme')}</legend>
          <div className="segmented">
            {THEME_ORDER.map((th: SettingsData['theme']) => (
              <button
                key={th}
                className={settings.theme === th ? 'active' : ''}
                aria-pressed={settings.theme === th}
                onClick={() => updateSettings({ theme: th })}
              >
                {THEME_ICONS[th]} {t(`theme.${th}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>{t('settings.dailyGoal')}</legend>
          <div className="segmented wrap">
            {DAILY_GOALS.map((g) => (
              <button
                key={g}
                className={settings.dailyGoal === g ? 'active' : ''}
                aria-pressed={settings.dailyGoal === g}
                onClick={() => updateSettings({ dailyGoal: g })}
              >
                {t(`settings.goal.${g}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>{t('settings.tempo', { bpm: settings.tempo })}</span>
          <input
            type="range"
            min={50}
            max={150}
            step={5}
            value={settings.tempo}
            onChange={(e) => updateSettings({ tempo: Number(e.target.value) })}
          />
          <span className="muted small">{t('settings.tempoHint')}</span>
        </label>

        <fieldset className="field">
          <legend>{t('settings.sound')}</legend>
          {(['piano', 'synth'] as const).map((i) => (
            <label key={i} className="radio">
              <input
                type="radio"
                name="instrument"
                checked={settings.instrument === i}
                onChange={() => {
                  updateSettings({ instrument: i });
                  setInstrument(i);
                }}
              />
              {t(i === 'piano' ? 'settings.piano' : 'settings.synth')}
            </label>
          ))}
          <span className="muted small">{t(pianoReady ? 'settings.pianoLoaded' : 'settings.pianoLoading')}</span>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={settings.sfx} onChange={(e) => updateSettings({ sfx: e.target.checked })} />
          <span>
            {t('settings.sfx')}
            <span className="muted small block">{t('settings.sfxHint')}</span>
          </span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.fixedRoot}
            onChange={(e) => updateSettings({ fixedRoot: e.target.checked })}
          />
          <span>
            {t('settings.fixedRoot')}
            <span className="muted small block">{t('settings.fixedRootHint')}</span>
          </span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.showNoteNames}
            onChange={(e) => updateSettings({ showNoteNames: e.target.checked })}
          />
          <span>
            {t('settings.showNames')}
            <span className="muted small block">{t('settings.showNamesHint')}</span>
          </span>
        </label>

        <button className="btn" onClick={() => void test()}>
          {t('settings.test')}
        </button>
      </div>
    </div>
  );
}
