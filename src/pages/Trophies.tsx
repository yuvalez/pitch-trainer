import { EXERCISES, exerciseTitle } from '../exercises/levels';
import { ACHIEVEMENTS } from '../game/achievements';
import { RANKS, rankFor } from '../game/rules';
import { getLang, tDyn } from '../i18n';
import { useT } from '../i18n/useT';
import { useProgress } from '../progress/store';

export function Trophies() {
  const t = useT();
  const { game } = useProgress();
  const earned = ACHIEVEMENTS.filter((a) => a.id in game.achievements).length;
  const rank = rankFor(game.xp);
  const date = (ms: number) => new Date(ms).toLocaleDateString(getLang() === 'he' ? 'he-IL' : undefined);

  const records = [
    { icon: '⚡', label: t('trophies.totalXp'), value: game.xp },
    { icon: '✅', label: t('trophies.correct'), value: game.totalCorrect },
    { icon: '🎮', label: t('trophies.rounds'), value: game.rounds },
    { icon: '🔥', label: t('trophies.bestCombo'), value: game.bestCombo },
    { icon: '📅', label: t('trophies.bestStreak'), value: game.streak.best },
  ];
  const arcade = EXERCISES.filter((ex) => game.highScores[ex.id]);

  return (
    <div>
      <h1>🏆 {t('trophies.title')}</h1>
      <p className="muted">{t('trophies.sub', { n: earned, total: ACHIEVEMENTS.length })}</p>

      <div className="trophy-grid">
        {ACHIEVEMENTS.map((a) => {
          const at = game.achievements[a.id];
          return (
            <div key={a.id} className={`trophy ${at ? 'earned' : 'locked'}`}>
              <span className="trophy-icon" aria-hidden>
                {at ? a.icon : '🔒'}
              </span>
              <strong>{tDyn(`ach.${a.id}`, a.id)}</strong>
              <span className="small muted">{tDyn(`ach.${a.id}.desc`, '')}</span>
              {at && <span className="small trophy-date">{t('trophies.unlockedOn', { date: date(at) })}</span>}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>{t('trophies.records')}</h2>
        <div className="record-grid">
          {records.map((r) => (
            <div key={r.label} className="record">
              <span className="record-icon" aria-hidden>
                {r.icon}
              </span>
              <strong className="record-value">{r.value}</strong>
              <span className="small muted">{r.label}</span>
            </div>
          ))}
        </div>
        {arcade.length > 0 && (
          <>
            <h3>{t('trophies.highScores')}</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>⏱️ {t('play.timeAttack')}</th>
                    <th>❤️ {t('play.survival')}</th>
                  </tr>
                </thead>
                <tbody>
                  {arcade.map((ex) => (
                    <tr key={ex.id}>
                      <td>
                        <span aria-hidden>{ex.icon}</span> {exerciseTitle(ex.id)}
                      </td>
                      <td>{game.highScores[ex.id]?.timeAttack || '—'}</td>
                      <td>{game.highScores[ex.id]?.survival || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>{t('trophies.ranks')}</h2>
        <ol className="rank-ladder">
          {RANKS.map((r, i) => (
            <li key={i} className={i === rank.index ? 'current' : i < rank.index ? 'passed' : ''}>
              <span className="rank-icon" aria-hidden>
                {r.icon}
              </span>
              <strong>{tDyn(`rank.${i}`, '')}</strong>
              <span className="small muted">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
