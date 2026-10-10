import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import { Button } from '@/shared/ui/Button';
import { BrandMark, RodDivider } from '../art/BrandMark';
import motion from '../motion/motion.module.css';
import { supportsInView, watchInView } from '../motion/useInView';
import styles from './LandingFooter.module.css';

const SHARE = { title: 'Chaqqon-chaqqon', text: 'Mental arifmetika ustozlari uchun platforma' } as const;

type ShareResult = 'copied' | 'failed';

const RESULT_TEXT: Record<ShareResult, string> = {
  copied: 'Havola nusxalandi',
  failed: "Havolani nusxalab bo'lmadi",
};

/** The beads on the footer's rod, rightmost first: the order they are flicked across in. */
const BEADS = [0, 1, 2, 3] as const;

/* The same watch as Reveal's, so the rod shares its observer. */
const RAIL_WATCH = { threshold: 0, rootMargin: '0px 0px -8% 0px' } as const;

/**
 * Hands the page's address to the share sheet, or copies it where there is none. Returns what the
 * visitor should be told: nothing after a share, since the sheet itself was the answer.
 */
async function sharePage(): Promise<ShareResult | null> {
  const url = `${window.location.origin}/`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ ...SHARE, url });
      return null;
    } catch (error) {
      // Closing the sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      // Any other refusal still leaves the link to copy.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * The page's last strip (#landing-footer): brand, contact, "Kirish", sharing and the theme choice.
 * It hangs from an abacus rod whose beads are flicked across once when it scrolls into view. On a
 * phone it needs no room kept for the sticky apply bar: the bar slides away once the footer shows.
 */
export function LandingFooter({ contact }: { contact: string | null }) {
  const rail = useRef<HTMLDivElement>(null);
  const sharing = useRef(false);
  // `n` re-keys the message, so a second copy is announced and shown again.
  const [result, setResult] = useState<{ kind: ShareResult; n: number } | null>(null);

  // The beads wait at the rod's left end while it is below the fold, and slide over once reached.
  // Written on the DOM like Reveal's state, and only moved by CSS when motion is on and allowed.
  useLayoutEffect(() => {
    const element = rail.current;
    if (!element || !supportsInView()) return;
    if (element.getBoundingClientRect().top <= window.innerHeight) return;

    element.dataset.beads = 'wait';
    return watchInView(
      element,
      (entry, stop) => {
        if (!entry.isIntersecting) return;
        element.dataset.beads = 'go';
        stop();
      },
      RAIL_WATCH,
    );
  }, []);

  const share = async () => {
    // A second sheet while one is open is refused by the browser; the tap is simply ignored.
    if (sharing.current) return;
    sharing.current = true;
    const kind = await sharePage();
    sharing.current = false;
    if (kind) setResult((last) => ({ kind, n: (last?.n ?? 0) + 1 }));
  };

  return (
    <footer id="landing-footer" className={styles.footer}>
      <div className={styles.railBox}>
        <div
          ref={rail}
          className={styles.rail}
          style={{ '--beads': BEADS.length } as CSSProperties}
          aria-hidden="true"
        >
          <RodDivider />
          {BEADS.map((n) => (
            <span key={n} className={styles.track} style={{ '--n': n } as CSSProperties}>
              <span className={styles.bead} />
            </span>
          ))}
        </div>
      </div>

      <div className={styles.inner}>
        <div className={styles.about}>
          <BrandMark size={40} />
          <div className={styles.aboutText}>
            {/* Two lines on screen; the dot keeps the sentence whole where styles do not load. */}
            <p className={styles.brand}>
              <span className={styles.name}>© Chaqqon-chaqqon</span>
              <span className={styles.dot}> · </span>
              <span className={styles.tagline}>Mental arifmetika platformasi</span>
            </p>
            {contact && (
              <p className={styles.contact}>
                Aloqa: <span className={styles.contactValue}>{contact}</span>
              </p>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.links}>
            <Link to="/login" className={styles.login}>
              Kirish
            </Link>
            <Button variant="ghost" onClick={() => void share()}>
              <ShareIcon />
              Sahifani ulashish
            </Button>
            <p role="status" className={styles.status}>
              {result && (
                <span key={result.n} className={motion.rise} data-kind={result.kind}>
                  {result.kind === 'copied' && <span aria-hidden="true">✓ </span>}
                  {RESULT_TEXT[result.kind]}
                </span>
              )}
            </p>
          </div>

          <div className={styles.theme}>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}

/** An arrow leaving a tray: the share sign phones already use. */
function ShareIcon() {
  return (
    <svg
      className={styles.shareIcon}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
    </svg>
  );
}
