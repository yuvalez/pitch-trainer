import { CHORD_TYPES, chordLabel } from '../exercises/chords';
import type { TKey } from '../i18n';
import { useT } from '../i18n/useT';
import { updateSettings, useProgress } from '../progress/store';

const PRESETS: { label: TKey; types: string[] }[] = [
  { label: 'custom.preset.majMin', types: ['maj', 'min'] },
  { label: 'custom.preset.triads', types: ['maj', 'min', 'dim', 'aug'] },
  { label: 'custom.preset.sus', types: ['maj', 'sus2', 'sus4'] },
  { label: 'custom.preset.sevenths', types: ['maj7', 'm7', 'dom7', 'm7b5', 'dim7'] },
  { label: 'custom.preset.maj7v7', types: ['maj7', 'dom7'] },
  { label: 'custom.preset.jazz', types: ['maj7', 'm7', 'dom7', 'm7b5', 'dim7', 'dom9', 'maj9', 'm9'] },
];

/** Choose which chord types Custom practice rounds draw from. Changes apply from the next question. */
export function CustomChordPicker() {
  const t = useT();
  const { settings } = useProgress();
  const { types, inversions } = settings.customChords;
  const set = (next: string[]) => updateSettings({ customChords: { types: next, inversions } });
  const toggle = (type: string) => set(types.includes(type) ? types.filter((x) => x !== type) : [...types, type]);
  const same = (a: string[]) => a.length === types.length && a.every((x) => types.includes(x));

  return (
    <div className="card custom-picker">
      <div className="row presets">
        <span className="muted small">{t('custom.presets')}</span>
        {PRESETS.map((p) => (
          <button key={p.label} className={`btn small-btn ${same(p.types) ? 'active' : ''}`} onClick={() => set(p.types)}>
            {t(p.label)}
          </button>
        ))}
      </div>
      <div className="chord-checks">
        {Object.keys(CHORD_TYPES).map((type) => {
          const checked = types.includes(type);
          return (
            <label key={type} className={`chord-check ${checked ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                // Keep at least two types so there is always a real choice.
                disabled={checked && types.length <= 2}
                onChange={() => toggle(type)}
              />
              {chordLabel(type)}
            </label>
          );
        })}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={inversions}
          onChange={(e) => updateSettings({ customChords: { types, inversions: e.target.checked } })}
        />
        <span>{t('custom.inversions')}</span>
      </label>
      <p className="muted small">{t('custom.note')}</p>
    </div>
  );
}
