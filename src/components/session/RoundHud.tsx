import { comboMultiplier } from '../../game/rules';
import { useT } from '../../i18n/useT';
import type { RoundStats } from './useRound';

interface Props {
  stats: RoundStats;
  qNum: number;
  answered: boolean;
  /** Questions in the round, or null for endless modes. */
  length: number | null;
  maxHearts: number | null;
  heartsLeft: number | null;
  /** Time Attack: remaining and total time in ms. */
  timeLeft?: number;
  totalTime?: number;
}

/** Hearts, combo flame, XP and progress (or the Time Attack clock) above the question. */
export function RoundHud({ stats, qNum, answered, length, maxHearts, heartsLeft, timeLeft, totalTime }: Props) {
  const t = useT();
  const mult = comboMultiplier(stats.combo);
  const done = qNum - (answered ? 0 : 1);
  const timed = timeLeft !== undefined && totalTime;
  const secs = timed ? Math.ceil(timeLeft / 1000) : 0;

  return (
    <div className="hud">
      <div className="hud-row">
        {maxHearts !== null && heartsLeft !== null ? (
          <span className="hearts" aria-label={t('session.hearts', { n: heartsLeft })}>
            {Array.from({ length: maxHearts }, (_, i) => (
              <span key={i} className={`heart ${i < heartsLeft ? '' : 'lost'}`} aria-hidden>
                {i < heartsLeft ? '❤️' : '🤍'}
              </span>
            ))}
          </span>
        ) : (
          <span className="muted small">
            {length ? t('session.question', { n: qNum, total: length }) : t('session.questionN', { n: qNum })}
          </span>
        )}
        <span className="hud-chips">
          {stats.combo >= 2 && (
            <span key={stats.combo} className={`chip combo ${mult > 1 ? 'hot' : ''}`} title={t('session.inARow', { n: stats.combo })}>
              🔥 {stats.combo}
              {mult > 1 && <strong> ×{mult}</strong>}
            </span>
          )}
          <span className="chip xp">⚡ {stats.xp} XP</span>
          {timed && <span className={`chip timer ${secs <= 10 ? 'urgent' : ''}`}>⏱ {secs}</span>}
        </span>
      </div>
      {timed ? (
        <div className="progress-bar timer-bar" aria-label={t('session.time', { s: secs })}>
          <div style={{ width: `${(timeLeft / totalTime) * 100}%` }} />
        </div>
      ) : (
        length !== null && (
          <div className="progress-bar" aria-hidden>
            <div style={{ width: `${(done / length) * 100}%` }} />
          </div>
        )
      )}
      {maxHearts !== null && (
        <p className="muted small hud-sub">
          {length ? t('session.question', { n: qNum, total: length }) : t('session.questionN', { n: qNum })}
        </p>
      )}
    </div>
  );
}
