import { useId, useLayoutEffect, useRef } from 'react';
import type { PlatformSettings } from '@/application/ports';
import type { Tariff } from '@/domain/teacherBilling';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import { ApplicationForm } from '../ApplicationForm';
import landing from '../Landing.module.css';
import { applyLead, steps } from '../content/landingCopy';
import { supportsInView, watchInView } from '../motion/useInView';
import styles from './Apply.module.css';

/** The card's host: a mascot no other section uses. */
const MASCOT_DIGIT = 4;

/* The same watch as Reveal's, so the two share one observer. */
const PEEK_WATCH = { threshold: 0, rootMargin: '0px 0px -8% 0px' } as const;

export interface ApplyProps {
  /** Offered tariffs in their sortOrder; undefined while loading, empty when none is public. */
  tariffs: Tariff[] | undefined;
  settings: PlatformSettings | undefined;
  /** The platform's phone and Telegram, for the thank-you; null when the admin has set none. */
  contact: string | null;
  /** The tariff an apply button chose; it wins over the form's chips until the teacher picks again. */
  chosenTariff: string | null;
  /** Bumped by every tariff card's apply click, so the same card picked twice still wins again. */
  choiceSeq: number;
  /** The class size picked in the tariffs' chooser; it prefills the form. */
  studentsCount: number | null;
  /** The login from a colleague's invite link, already normalized; '' when there was none. */
  referrer: string;
  /** Demo rounds the visitor played above; only this count is mentioned, nothing goes into the form. */
  rounds: number;
}

/**
 * "Ariza qoldiring" (#ariza): the page's last word and its one form. Never hidden by a scroll
 * reveal, because an invite link (`/?taklif=…#ariza`) lands straight here. The heading is the focus
 * target of every apply button, so a keyboard or screen-reader visitor arrives with the page.
 *
 * On a desktop the card opens into two columns: the heading with the "Qanday boshlanadi" steps
 * (the same words as the steps section above) beside the form. Narrower screens show the form alone.
 */
export function Apply({
  tariffs,
  settings,
  contact,
  chosenTariff,
  choiceSeq,
  studentsCount,
  referrer,
  rounds,
}: ApplyProps) {
  const mascot = useRef<HTMLSpanElement>(null);
  const nextLabelId = useId();
  const trialDays = settings?.trialDays ?? 0;

  // The mascot ducks behind the card while it is below the fold and peeks up once it is reached.
  // Written on the DOM like Reveal's state, and only hidden by CSS when motion is on and allowed.
  useLayoutEffect(() => {
    const element = mascot.current;
    if (!element || !supportsInView()) return;
    if (element.getBoundingClientRect().top <= window.innerHeight) return;

    element.dataset.peek = 'wait';
    return watchInView(
      element,
      (entry, stop) => {
        if (!entry.isIntersecting) return;
        element.dataset.peek = 'up';
        stop();
      },
      PEEK_WATCH,
    );
  }, []);

  return (
    <section id="ariza" className={`${landing.section} ${landing.bandBrand}`} aria-labelledby="ariza-title">
      <div className={styles.stage}>
        <span ref={mascot} className={styles.mascot} aria-hidden="true">
          <span className={styles.mascotInner}>
            <DigitCharacter digit={MASCOT_DIGIT} size={48} />
          </span>
        </span>

        <div className={styles.card}>
          <div className={styles.intro}>
            <div className={styles.introInner}>
              <div className={`${landing.sectionHead} ${styles.head}`}>
                <h2 id="ariza-title" tabIndex={-1} className={`${landing.sectionTitle} ${styles.title}`}>
                  Ariza qoldiring
                </h2>
                <p className={`${landing.lead} ${styles.lead}`}>{applyLead(trialDays)}</p>
                {rounds >= 1 && (
                  <p className={styles.rounds}>
                    <span className={styles.roundsIcon} aria-hidden="true">
                      ⚡
                    </span>
                    <span>
                      Siz <strong className={styles.roundsCount}>{rounds}</strong> ta raund o'ynadingiz —
                      o'quvchilaringiz ham uyda shunday mashq qila oladi.
                    </span>
                  </p>
                )}
              </div>

              {/* Desktop only (CSS): what follows the application, beside the form that starts it. */}
              <div className={styles.next}>
                <p id={nextLabelId} className={landing.eyebrow}>
                  Qanday boshlanadi
                </p>
                <ol className={styles.nextList} aria-labelledby={nextLabelId}>
                  {steps(trialDays).map((step, index) => (
                    // By position, like the steps section: step 3 changes its words, not its place.
                    <li key={index} className={styles.nextStep} data-trial={step.trial || undefined}>
                      <span className={styles.nextDisc} aria-hidden="true">
                        {step.trial ? '🎁' : index + 1}
                      </span>
                      <span className={styles.nextText}>
                        <strong className={styles.nextTitle}>{step.title}</strong>
                        <span className={styles.nextBody}>{step.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <ApplicationForm
            tariffs={tariffs ?? []}
            chosenTariffId={chosenTariff}
            choiceSeq={choiceSeq}
            referralEnabled={settings?.referralEnabled ?? false}
            referrer={referrer}
            studentsCount={studentsCount}
            contact={contact}
          />
        </div>
      </div>
    </section>
  );
}
