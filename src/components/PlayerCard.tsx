import { currentStreak, rankFor, xpToday } from '../game/rules';
import { tCount, tDyn } from '../i18n';
import { useT } from '../i18n/useT';
import { useProgress } from '../progress/store';

/** Rank, XP towards the next rank, daily goal ring and streak flame. */
export function PlayerCard() {
  const t = useT();
  const { game, settings } = useProgress();
  const now = new Date();
  const rank = rankFor(game.xp);
  const today = xpToday(game, now);
  const goal = settings.dailyGoal;
  const goalPct = Math.min(1, today / goal);
  const streak = currentStreak(game, now);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <section className="player-card">
      <div className="player-rank">
        <span className="rank-badge" aria-hidden>
          {rank.icon}
        </span>
        <div className="rank-text">
          <strong className="rank-name">{tDyn(`rank.${rank.index}`, '')}</strong>
          <span className="small">{t('player.xp', { xp: game.xp })}</span>
          <div className="meter xp-meter" aria-hidden>
            <div style={{ width: `${rank.progress * 100}%` }} />
          </div>
          <span className="small muted">
            {rank.toNext === null
              ? t('player.maxRank')
              : t('player.toNext', { xp: rank.toNext, rank: tDyn(`rank.${rank.index + 1}`, '') })}
          </span>
        </div>
      </div>

      <div className="player-stat" title={t('player.daily')}>
        <svg className="goal-ring" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={R} className="ring-bg" />
          <circle
            cx="32"
            cy="32"
            r={R}
            className={`ring-fg ${goalPct >= 1 ? 'done' : ''}`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - goalPct)}
          />
        </svg>
        <span className="ring-icon" aria-hidden>
          {goalPct >= 1 ? '✅' : '🎯'}
        </span>
        <span className="stat-text">
          <strong>{t('player.daily')}</strong>
          <span className="small muted">
            {goalPct >= 1 ? t('player.goalDone') : t('player.dailyProgress', { xp: today, goal })}
          </span>
        </span>
      </div>

      <div className="player-stat" title={t('player.streakHint')}>
        <span className={`flame ${streak > 0 ? 'lit' : ''}`} aria-hidden>
          🔥
        </span>
        <span className="stat-text">
          <strong>{t('player.streak')}</strong>
          <span className="small muted">{tCount('player.streakDays', streak)}</span>
        </span>
      </div>
    </section>
  );
}
