import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Toasts } from './components/Toasts';
import { currentStreak } from './game/rules';
import { useT } from './i18n/useT';
import { Exercise } from './pages/Exercise';
import { Home } from './pages/Home';
import { Learn } from './pages/Learn';
import { Settings } from './pages/Settings';
import { Stats } from './pages/Stats';
import { Trophies } from './pages/Trophies';
import { updateSettings, useProgress } from './progress/store';
import { THEME_ICONS, THEME_ORDER, useDocumentSettings } from './theme';

const NAV = [
  { to: '/', icon: '🎮', label: 'nav.play' },
  { to: '/learn', icon: '📚', label: 'nav.learn' },
  { to: '/trophies', icon: '🏆', label: 'nav.trophies' },
  { to: '/stats', icon: '📊', label: 'nav.progress' },
  { to: '/settings', icon: '⚙️', label: 'nav.settings' },
] as const;

export function App() {
  // useT first: it sets the active language before any child renders.
  const t = useT();
  const { settings, game } = useProgress();
  useDocumentSettings(settings);
  const streak = currentStreak(game, new Date());
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length];

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-logo" aria-hidden>
            𝄞
          </span>
          <span>{t('app.name')}</span>
        </NavLink>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              <span className="nav-label">{t(n.label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="top-actions">
          <span className={`chip streak-chip ${streak > 0 ? 'lit' : ''}`} title={t('player.streakHint')}>
            🔥 {streak}
          </span>
          <span className="chip xp" title="XP">
            ⚡ {game.xp}
          </span>
          <button
            className="icon-btn"
            onClick={() => updateSettings({ lang: settings.lang === 'he' ? 'en' : 'he' })}
            aria-label={t('lang.switchLabel')}
            title={t('lang.switchLabel')}
          >
            {t('lang.switch')}
          </button>
          <button
            className="icon-btn"
            onClick={() => updateSettings({ theme: nextTheme })}
            aria-label={t('theme.toggle', { name: t(`theme.${settings.theme}`) })}
            title={t('theme.toggle', { name: t(`theme.${settings.theme}`) })}
          >
            {THEME_ICONS[settings.theme]}
          </button>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exercise/:id" element={<Exercise />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/trophies" element={<Trophies />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Toasts />
    </HashRouter>
  );
}
