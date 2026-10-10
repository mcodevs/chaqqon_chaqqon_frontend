import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import landing from '../Landing.module.css';
import { BrandMark } from '../art/BrandMark';
import { NAV_LINKS } from '../content/landingCopy';
import { isPlainClick, scrollToId, sectionHeadingId } from '../motion/scrollToId';
import { prefersReducedMotion } from '../motion/usePrefersReducedMotion';
import { supportsInView, watchInView } from '../motion/useInView';
import styles from './LandingHeader.module.css';

/* The same watch as Reveal's, so the sentinel adds no observer of its own. */
const TOP_WATCH = { threshold: 0, rootMargin: '0px 0px -8% 0px' } as const;

/**
 * The landing's top bar: skip link, brand, the section menu (from 768px) and "Kirish". It turns
 * from flat to lifted once the page leaves its top, read from a 1px sentinel by the shared
 * IntersectionObserver, so not a single scroll listener runs.
 */
export function LandingHeader() {
  const sentinel = useRef<HTMLSpanElement>(null);
  // Without the observer the header cannot tell, so it keeps the lifted look throughout.
  const [scrolled, setScrolled] = useState(() => !supportsInView());

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    return watchInView(element, (entry) => setScrolled(!entry.isIntersecting), TOP_WATCH);
  }, []);

  // main#asosiy starts right under the bar, so focus alone is enough: a scroll would tuck its top
  // under the sticky header.
  const skipToMain = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById('asosiy');
    if (!main || !isPlainClick(event)) return;
    event.preventDefault();
    main.focus({ preventScroll: true });
  };

  const toTop = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const toSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const section = document.getElementById(id);
    if (!section || !isPlainClick(event)) return;
    event.preventDefault();
    scrollToId(id, { focusId: sectionHeadingId(section) });
  };

  return (
    <>
      <a href="#asosiy" className={landing.skipLink} onClick={skipToMain}>
        Asosiy qismga o'tish
      </a>
      <span ref={sentinel} className={styles.sentinel} aria-hidden="true" />

      <header className={styles.header} data-scrolled={scrolled || undefined}>
        <div className={styles.inner}>
          <a href="/" className={styles.brand} onClick={toTop}>
            <BrandMark size={32} className={styles.mark} />
            <span className={styles.wordmark}>Chaqqon-chaqqon</span>
          </a>

          <nav className={styles.nav} aria-label="Bo'limlar">
            <ul className={styles.navList}>
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    className={styles.navLink}
                    onClick={(event) => toSection(event, link.id)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <Link to="/login" className={styles.login}>
            Kirish
          </Link>
        </div>
      </header>
    </>
  );
}
