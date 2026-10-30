import type { ExerciseId } from '../exercises/types';
import type { PlayMode } from '../game/rules';
import { useT } from '../i18n/useT';
import { useProgress } from '../progress/store';

interface Props {
  id: ExerciseId;
  mode: PlayMode;
  seconds: number;
  onChange: (m: PlayMode) => void;
}

const MODES: { mode: PlayMode; icon: string }[] = [
  { mode: 'classic', icon: '⭐' },
  { mode: 'timeAttack', icon: '⏱️' },
  { mode: 'survival', icon: '❤️' },
];

export function ModePicker({ id, mode, seconds, onChange }: Props) {
  const t = useT();
  const { game } = useProgress();
  const hs = game.highScores[id];

  return (
    <div className="modes" role="radiogroup" aria-label={t('play.mode')}>
      {MODES.map((m) => {
        const best = m.mode === 'classic' ? null : (hs?.[m.mode] ?? 0);
        return (
          <button
            key={m.mode}
            role="radio"
            aria-checked={mode === m.mode}
            className={`mode-card ${mode === m.mode ? 'active' : ''}`}
            onClick={() => onChange(m.mode)}
          >
            <span className="mode-icon" aria-hidden>
              {m.icon}
            </span>
            <span className="mode-text">
              <strong>{t(`play.${m.mode}`)}</strong>
              <span className="small muted block">{t(`play.${m.mode}.desc`, { s: seconds })}</span>
              {best !== null && best > 0 && <span className="small best">{t('play.best', { n: best })}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
