import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { TKey } from '../i18n';
import { useT } from '../i18n/useT';
import { useProgress } from '../progress/store';
import { LearnContentEn } from './learn/content.en';
import { LearnContentHe } from './learn/content.he';

const TOC: [string, TKey][] = [
  ['intervals', 'learn.toc.intervals'],
  ['chords', 'learn.toc.chords'],
  ['identify-chords', 'learn.toc.identify'],
  ['scales', 'learn.toc.scales'],
  ['harmony', 'learn.toc.harmony'],
  ['by-ear', 'learn.toc.byEar'],
];

export function Learn() {
  const t = useT();
  const { settings } = useProgress();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="learn">
      <h1>📚 {t('learn.title')}</h1>
      <nav className="toc">
        {TOC.map(([id, label]) => (
          <Link key={id} to={`/learn#${id}`}>
            {t(label)}
          </Link>
        ))}
      </nav>
      {settings.lang === 'he' ? <LearnContentHe /> : <LearnContentEn />}
    </div>
  );
}
