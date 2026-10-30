import { useState } from 'react';
import { EXERCISES, exerciseTitle, levelName } from '../exercises/levels';
import { LEVELS } from '../exercises/types';
import { itemLabel } from '../i18n/items';
import { useT } from '../i18n/useT';
import { isMastered, recentAccuracy, resetProgress, useProgress } from '../progress/store';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export function Stats() {
  const t = useT();
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);

  const weak = EXERCISES.flatMap((ex) =>
    Object.entries(progress.exercises[ex.id].items)
      .filter(([, s]) => s.seen >= 3)
      .map(([item, s]) => ({ id: ex.id, item, acc: s.correct / s.seen, seen: s.seen })),
  )
    .filter((w) => w.acc < 1)
    .sort((a, b) => a.acc - b.acc || b.seen - a.seen)
    .slice(0, 10);

  const totalAnswers = EXERCISES.reduce(
    (sum, ex) => sum + LEVELS.reduce<number>((s, l) => s + (progress.exercises[ex.id].levels[l]?.total ?? 0), 0),
    0,
  );

  return (
    <div>
      <h1>📊 {t('stats.title')}</h1>
      <p className="muted">{t('stats.summary', { n: totalAnswers })}</p>

      <div className="card">
        <h2>{t('stats.byExercise')}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('stats.exercise')}</th>
                {LEVELS.map((l) => (
                  <th key={l}>{levelName(l)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXERCISES.map((ex) => (
                <tr key={ex.id}>
                  <td className="nowrap">
                    <span aria-hidden>{ex.icon}</span> {exerciseTitle(ex.id)}
                  </td>
                  {LEVELS.map((l) => {
                    const s = progress.exercises[ex.id].levels[l];
                    return (
                      <td key={l} className={isMastered(s) ? 'mastered' : ''}>
                        {s ? (
                          <>
                            <strong>{pct(recentAccuracy(s))}</strong>
                            <span className="muted small block">
                              {t('stats.detail', { n: s.total, streak: s.bestStreak })}
                            </span>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>🎯 {t('stats.next')}</h2>
        {weak.length === 0 ? (
          <p className="muted">{t('stats.nextEmpty')}</p>
        ) : (
          <ul className="weak-list">
            {weak.map((w) => (
              <li key={`${w.id}-${w.item}`}>
                <span>
                  <strong>{itemLabel(w.id, w.item)}</strong>{' '}
                  <span className="muted small">{exerciseTitle(w.id)}</span>
                </span>
                <span className="meter small-meter">
                  <span style={{ width: `${w.acc * 100}%` }} />
                </span>
                <span className="muted small">{t('stats.of', { pct: pct(w.acc), n: w.seen })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>{t('stats.reset')}</h2>
        {!confirming ? (
          <button className="btn danger" onClick={() => setConfirming(true)}>
            {t('stats.resetAll')}
          </button>
        ) : (
          <div className="row">
            <span>{t('stats.resetConfirm')}</span>
            <button
              className="btn danger"
              onClick={() => {
                resetProgress();
                setConfirming(false);
              }}
            >
              {t('stats.yesReset')}
            </button>
            <button className="btn" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
