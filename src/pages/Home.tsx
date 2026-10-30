import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PlayerCard } from '../components/PlayerCard';
import {
  EXERCISES,
  GROUPS,
  exerciseBlurb,
  exerciseMeta,
  exerciseTitle,
  groupTitle,
  levelName,
} from '../exercises/levels';
import { LEVELS } from '../exercises/types';
import { useT } from '../i18n/useT';
import { recentAccuracy, useProgress } from '../progress/store';

export function Home() {
  const t = useT();
  const progress = useProgress();
  const last = progress.game.last ? exerciseMeta(progress.game.last) : null;

  return (
    <div>
      <section className="hero">
        <div>
          <h1>{t('home.title')}</h1>
          <p className="muted">{t('home.sub')}</p>
        </div>
        <Link
          to={`/exercise/${last?.id ?? 'intervals'}`}
          className="btn primary big continue-btn"
          style={last ? ({ '--c': last.color } as CSSProperties) : undefined}
        >
          <span aria-hidden>{last?.icon ?? '▶'}</span>
          {last ? t('home.continue', { name: exerciseTitle(last.id) }) : t('home.startHere')}
        </Link>
      </section>

      <PlayerCard />

      {GROUPS.map((g) => (
        <section key={g}>
          <h2 className="group-title">{groupTitle(g)}</h2>
          <div className="grid">
            {EXERCISES.filter((ex) => ex.group === g).map((ex) => {
              const p = progress.exercises[ex.id];
              const acc = recentAccuracy(p.levels[p.unlocked]);
              const stars = progress.game.stars[ex.id] ?? {};
              return (
                <Link
                  key={ex.id}
                  to={`/exercise/${ex.id}`}
                  className="card exercise-card"
                  style={{ '--c': ex.color } as CSSProperties}
                >
                  <div className="ex-head">
                    <span className="ex-icon" aria-hidden>
                      {ex.icon}
                    </span>
                    <span className="badge">{levelName(p.unlocked)}</span>
                  </div>
                  <h3 className="ex-title">{exerciseTitle(ex.id)}</h3>
                  <p className="ex-blurb">{exerciseBlurb(ex.id)}</p>
                  <div className="ex-foot">
                    <span className="level-stars" dir="ltr">
                      {LEVELS.map((l) => (
                        <span key={l} className={`lv-stars ${l > p.unlocked ? 'locked' : ''}`} title={levelName(l)}>
                          {[1, 2, 3].map((n) => (
                            <span key={n} className={n <= (stars[l] ?? 0) ? 'on' : ''}>
                              ★
                            </span>
                          ))}
                        </span>
                      ))}
                    </span>
                    <span className="muted small">
                      {acc === null ? t('home.notStarted') : t('home.accuracy', { pct: Math.round(acc * 100) })}
                    </span>
                  </div>
                </Link>
              );
            })}
            {g === 'basics' && (
              <Link to="/learn" className="card exercise-card learn-card" style={{ '--c': '#7c4dff' } as CSSProperties}>
                <div className="ex-head">
                  <span className="ex-icon" aria-hidden>
                    📚
                  </span>
                </div>
                <h3 className="ex-title">{t('home.learn.title')}</h3>
                <p className="ex-blurb">{t('home.learn.body')}</p>
                <p className="muted small">{t('home.learn.small')}</p>
              </Link>
            )}
          </div>
        </section>
      ))}

      <section className="card path">
        <h2>🗺️ {t('home.path.title')}</h2>
        <ol>
          <li>{t('home.path.1')}</li>
          <li>{t('home.path.2')}</li>
          <li>{t('home.path.3')}</li>
          <li>{t('home.path.4')}</li>
          <li>{t('home.path.5')}</li>
        </ol>
        <p className="muted small">{t('home.path.note')}</p>
      </section>
    </div>
  );
}
