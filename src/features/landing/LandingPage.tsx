import { useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REFERRAL_PARAM, normalizeReferrer } from '@/domain/applications';
import { contactLine } from '@/features/teacher/subscription/subscriptionText';
import { useOfferedTariffs, usePlatformSettings, usePublicStats } from '@/shared/services/queries';
import styles from './Landing.module.css';
import { ctaLabel } from './content/landingCopy';
import { scrollToId } from './motion/scrollToId';
import { usePrefersReducedMotion } from './motion/usePrefersReducedMotion';
import { AbacusSection } from './sections/AbacusSection';
import { Apply } from './sections/Apply';
import { Faq } from './sections/Faq';
import { Features } from './sections/Features';
import { Hero } from './sections/Hero';
import { LandingFooter } from './sections/LandingFooter';
import { LandingHeader } from './sections/LandingHeader';
import { Steps } from './sections/Steps';
import { StickyApplyBar } from './sections/StickyApplyBar';
import { Tariffs } from './sections/Tariffs';
import { INITIAL_TALLY, tallyReducer } from './sections/demo/demoConfig';

/** How long an invite's #ariza jump waits for the live stats above the form before it goes anyway. */
const STATS_WAIT_MS = 3000;
/** The cap on the whole wait: a failed tariffs or settings load must not keep the form out of reach. */
const SLOW_LOAD_WAIT_MS = 8000;

/**
 * The platform's front door for teachers: a demo round to play, what it changes, what it costs, and
 * the application form. The only place the landing's data is loaded; the sections get it as props
 * and reach each other only through fixed ids (#hero-cta, #tariflar, #ariza, #ariza-title…).
 */
export function LandingPage() {
  const tariffs = useOfferedTariffs();
  const settings = usePlatformSettings();
  const stats = usePublicStats();
  const contact = contactLine(settings);
  const trialDays = settings?.trialDays ?? 0;
  // A colleague's invite link names them; the form keeps it for the admin.
  const [searchParams] = useSearchParams();
  const referrer = normalizeReferrer(searchParams.get(REFERRAL_PARAM) ?? '');

  // The tariff a card's apply button chose, with a count so choosing the same card again still
  // reaches the form after the teacher picked another chip there.
  const [choice, setChoice] = useState<{ id: string | null; seq: number }>({ id: null, seq: 0 });
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  // The guest's demo score: kept in memory only, never stored and never sent.
  const [tally, dispatch] = useReducer(tallyReducer, INITIAL_TALLY);
  const [demoBusy, setDemoBusy] = useState(false);

  // Scroll reveals hide what is below the fold until it is reached. Without IntersectionObserver
  // nothing would ever show it again, and an invite's jump to #ariza must land on a page that is
  // already still, so in both cases the page simply stays as it is.
  const reduced = usePrefersReducedMotion();
  // Decided once, on the first render: the page is a client-only app, so window is always there.
  const [motionOn] = useState(() => 'IntersectionObserver' in window && window.location.hash !== '#ariza');

  // An invite link ends in #ariza, but the tariffs and the stats above the form load later and push
  // it down, so the jump waits for them, and happens once. A failed load stays undefined for good,
  // so the stats get a few seconds at most, and the whole wait a few more; the browser never jumps
  // to the fragment itself (it is rendered too late), so these timers are the invitee's only way
  // there. Only an invite's arrival needs them.
  const [statsGaveUp, setStatsGaveUp] = useState(false);
  useEffect(() => {
    if (stats !== undefined || window.location.hash !== '#ariza') return;
    const timer = window.setTimeout(() => setStatsGaveUp(true), STATS_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [stats]);
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    if (window.location.hash !== '#ariza') return;
    const timer = window.setTimeout(() => setWaitedOut(true), SLOW_LOAD_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const loaded =
    (tariffs !== undefined && settings !== undefined && (stats !== undefined || statsGaveUp)) || waitedOut;
  const jumped = useRef(false);
  // A visitor who has started scrolling, tapping or typing is never pulled away from it by a late jump.
  useEffect(() => {
    if (window.location.hash !== '#ariza') return;
    const drop = () => {
      jumped.current = true;
    };
    const events = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
    for (const event of events) window.addEventListener(event, drop, { passive: true, once: true });
    return () => {
      for (const event of events) window.removeEventListener(event, drop);
    };
  }, []);
  useEffect(() => {
    if (!loaded || jumped.current || window.location.hash !== '#ariza') return;
    jumped.current = true;
    document.getElementById('ariza')?.scrollIntoView();
  }, [loaded]);

  // Every apply button lands here; focus goes to the form's heading so a keyboard arrives with the page.
  const goToForm = () => scrollToId('ariza', { focusId: 'ariza-title' });
  // Only the tariffs' buttons choose; the hero and the sticky bar leave the form's chips as they are.
  const apply = (tariffId: string | null) => {
    setChoice((current) => ({ id: tariffId, seq: current.seq + 1 }));
    goToForm();
  };

  return (
    <div
      className={styles.page}
      data-landing-motion={motionOn && !reduced ? 'on' : undefined}
      data-demo-busy={demoBusy || undefined}
    >
      <LandingHeader />

      <main id="asosiy" tabIndex={-1} className={styles.main}>
        <Hero
          settings={settings}
          stats={stats}
          tariffs={tariffs}
          tally={tally}
          onResult={(isCorrect, section) => dispatch({ type: 'result', isCorrect, section })}
          onBusyChange={setDemoBusy}
          onApply={goToForm}
        />
        <Features tariffs={tariffs} />
        <AbacusSection />
        <Steps trialDays={trialDays} />
        <Tariffs
          tariffs={tariffs}
          settings={settings}
          studentsCount={studentsCount}
          onStudentsCount={setStudentsCount}
          onApply={apply}
        />
        <Faq settings={settings} contact={contact} />
        <Apply
          tariffs={tariffs}
          settings={settings}
          contact={contact}
          chosenTariff={choice.id}
          choiceSeq={choice.seq}
          studentsCount={studentsCount}
          referrer={referrer}
          rounds={tally.rounds}
        />
      </main>

      <LandingFooter contact={contact} />
      <StickyApplyBar label={ctaLabel(settings)} demoBusy={demoBusy} onApply={goToForm} />
    </div>
  );
}
