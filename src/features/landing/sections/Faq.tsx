import { Fragment } from 'react';
import type { PlatformSettings } from '@/application/ports';
import landing from '../Landing.module.css';
import { faqItems } from '../content/landingCopy';
import { Reveal } from '../motion/Reveal';
import styles from './Faq.module.css';

export interface FaqProps {
  /** Decides the trial, money-back and referral answers; undefined while loading counts as none offered. */
  settings: PlatformSettings | undefined;
  /** The admin's phone and Telegram from contactLine, or null while neither is set. */
  contact: string | null;
}

/**
 * "Ko'p so'raladigan savollar" (#savollar): what a teacher asks before applying, answered only with
 * what the platform really does. Native details and summary, so the keyboard and screen readers work
 * without a line of script. Not an exclusive accordion: opening one answer never closes another and
 * shifts the list under the reader's finger.
 */
export function Faq({ settings, contact }: FaqProps) {
  const items = faqItems(settings);

  return (
    <section id="savollar" aria-labelledby="savollar-title" className={landing.section}>
      <div className={styles.layout}>
        <div className={`${landing.sectionHead} ${styles.head}`}>
          <h2 id="savollar-title" className={landing.sectionTitle}>
            Ko'p so'raladigan savollar
          </h2>
        </div>

        <div className={styles.body}>
          <ul className={styles.list}>
            {items.map((item, index) => (
              <Reveal as="li" key={item.id} index={index}>
                <details className={styles.item}>
                  <summary className={styles.summary}>
                    <span className={styles.question}>{item.question}</span>
                    <span className={styles.chevron} aria-hidden="true" />
                  </summary>
                  <p className={styles.answer}>{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </ul>

          {contact && <ContactLine contact={contact} index={items.length} />}
        </div>
      </div>
    </section>
  );
}

/** "Javob topmadingizmi? Aloqa: …": the way to a person when the list falls short. */
function ContactLine({ contact, index }: { contact: string; index: number }) {
  // contactLine joins the phone and the Telegram handle with " · ". Each is kept whole (its spaces
  // made unbreakable), so a phone number never breaks across two lines; only one longer than the
  // whole line may wrap.
  const [first, ...rest] = contact.split(' · ').map(keepWhole);

  return (
    <Reveal as="p" index={index} className={styles.contact}>
      <span className={styles.contactIcon} aria-hidden="true">
        💬
      </span>
      <span className={styles.contactText}>
        <span className={styles.contactAsk}>Javob topmadingizmi?</span>{' '}
        <span className={styles.contactWay}>
          <span className={styles.whole}>
            Aloqa: <span className={styles.contactValue}>{first}</span>
          </span>
          {rest.map((part, partIndex) => (
            <Fragment key={partIndex}>
              {' · '}
              <span className={`${styles.whole} ${styles.contactValue}`}>{part}</span>
            </Fragment>
          ))}
        </span>
      </span>
    </Reveal>
  );
}

/** The same text with its spaces made non-breaking: "+998 90 111 22 33" stays on one line. */
function keepWhole(text: string): string {
  return text.replace(/ /g, '\u00a0');
}
