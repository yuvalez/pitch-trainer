import { useEffect, useState } from 'react';
import { levelName } from '../../exercises/levels';
import type { Level } from '../../exercises/types';
import type { PlayMode } from '../../game/rules';
import { tDyn } from '../../i18n';
import { useT } from '../../i18n/useT';
import { Confetti } from '../Confetti';
import type { RoundSummary } from './useRound';

interface Props {
  summary: RoundSummary;
  mode: PlayMode;
  custom: boolean;
  level: Level;
  onAgain: () => void;
  onLevelChange: (l: Level) => void;
}

/** Counts up from 0 to `target` over about a second. */
function useCountUp(target: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(target);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setN(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return n;
}

export function RoundEnd({ summary: s, mode, custom, level, onAgain, onLevelChange }: Props) {
  const t = useT();
  const totalXp = s.xp + s.bonusXp;
  const xp = useCountUp(totalXp);
  const classic = mode === 'classic' && !custom;
  const arcade = mode !== 'classic' && !custom;

  const title =
    s.reason === 'time'
      ? t('end.timeUp')
      : s.reason === 'hearts'
        ? t(mode === 'survival' ? 'end.gameOver' : 'end.outOfHearts')
        : t('end.complete');
  const pct = s.answered > 0 ? s.score / s.answered : 0;
  const celebrate = s.stars === 3 || s.newRecord;

  return (
    <div className="card session-done pop-in">
      {celebrate && <Confetti />}
      <h2 className="end-title">{title}</h2>

      {classic && (
        <div className="big-stars" aria-label={`${s.stars} / 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`big-star ${n <= s.stars ? 'on' : ''}`} style={{ animationDelay: `${0.25 + n * 0.25}s` }}>
              ★
            </span>
          ))}
        </div>
      )}

      <p className="big-score">
        {arcade ? s.score : `${s.score} / ${s.answered}`}
        {arcade && <span className="muted small block">{t('end.correct', { n: s.score })}</span>}
      </p>

      <div className="end-chips">
        <span className="chip xp big-chip">⚡ {t('end.xp', { xp })}</span>
        {s.bestCombo >= 2 && <span className="chip combo big-chip">🔥 {t('end.bestCombo', { n: s.bestCombo })}</span>}
        {arcade &&
          (s.newRecord ? (
            <span className="chip record big-chip">🏆 {t('end.newRecord')}</span>
          ) : (
            <span className="chip big-chip">{t('end.record', { n: s.previousBest })}</span>
          ))}
      </div>

      {s.unlocked !== null && <p className="banner unlock">{t('end.unlocked', { level: levelName(s.unlocked) })}</p>}
      {s.rankUp !== null && <p className="banner rank">{t('end.rankUp', { rank: tDyn(`rank.${s.rankUp}`, '') })}</p>}

      {s.achievements.length > 0 && (
        <div className="end-trophies">
          <h3>{t('end.trophies')}</h3>
          <div className="trophy-row">
            {s.achievements.map((a) => (
              <span key={a.id} className="trophy-mini" title={tDyn(`ach.${a.id}.desc`, '')}>
                <span aria-hidden>{a.icon}</span> {tDyn(`ach.${a.id}`, a.id)}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="muted">
        {classic && s.reason === 'hearts' ? t('end.heartsTip') : pct >= 0.8 ? t('end.great') : t('end.keepPractising')}
      </p>
      <div className="row center">
        <button className="btn primary big" onClick={onAgain}>
          {t('end.again')}
        </button>
        {level < 3 && !custom && (
          <button className="btn big" onClick={() => onLevelChange((level + 1) as Level)}>
            {t('end.tryLevel', { level: levelName((level + 1) as Level) })}
          </button>
        )}
      </div>
    </div>
  );
}
