import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { supportsInView, watchInView } from '../motion/useInView';
import styles from './StickyApplyBar.module.css';

/** Where an apply button is already on screen, or where the bar would cover what the visitor reads. */
const WATCHED_IDS = ['hero-cta', 'tariflar', 'ariza', 'landing-footer'] as const;

/*
 * A block counts as on screen only where the bar and the header leave it visible: 57px off the top
 * (the sticky header, --lp-header-height) and 80px off the bottom (the bar itself). So the bar
 * slides out as a section clears its top edge. The hero's buttons block the bar until they have gone
 * up past the header, also while they still sit below the fold: on a short phone at load, or after a
 * round's result has grown the stage. Otherwise the bar would cover Boshlash, the screen's primary.
 */
const SECTION_WATCH = { threshold: 0, rootMargin: '-57px 0px -80px 0px' } as const;

/* Fields that bring up the on-screen keyboard; a bar pinned above it would cover what is typed. */
const TYPING_FIELD =
  "textarea, select, input:not([type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='range'], [type='color'], [type='file'], [type='image'], [type='hidden'])";

function isTypingField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches(TYPING_FIELD));
}

/**
 * The phone's way to the form from anywhere on the page (hidden from 768px by CSS). It shows only
 * while none of the hero buttons, the tariffs, the form or the footer is on screen, no field is
 * being typed in and no demo round is flashing. Hidden, it is also inert, so a keyboard or screen
 * reader never lands on a button nobody can see.
 */
export function StickyApplyBar({
  label,
  demoBusy,
  onApply,
}: {
  label: string;
  demoBusy: boolean;
  onApply: () => void;
}) {
  // Until the observer has reported, a block is assumed on screen: the bar never flashes in on load.
  // Without the observer it stays hidden for good; the hero and tariff buttons remain.
  const [blocked, setBlocked] = useState(true);
  const [typing, setTyping] = useState(() => isTypingField(document.activeElement));

  useEffect(() => {
    if (!supportsInView()) return;
    const onScreen = new Set<string>();
    const stops: (() => void)[] = [];
    for (const id of WATCHED_IDS) {
      const element = document.getElementById(id);
      // A block the page does not render cannot be in the way.
      if (!element) continue;
      onScreen.add(id);
      stops.push(
        watchInView(
          element,
          (entry) => {
            // Not yet reached is not the same as scrolled past: below the fold, the hero still blocks.
            const ahead =
              id === 'hero-cta' &&
              entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? window.innerHeight - 80);
            if (entry.isIntersecting || ahead) onScreen.add(id);
            else onScreen.delete(id);
            setBlocked(onScreen.size > 0);
          },
          SECTION_WATCH,
        ),
      );
    }
    // A jump straight past the hero (an anchor under reduced motion, a fling on a short landscape
    // phone, where the buttons start below the fold) never crosses the buttons themselves, so their
    // own watch would keep them "ahead" for good and the bar would never come. The hero around them
    // reports every time it enters or leaves, and then the buttons' live position settles it: they
    // block while their bottom is still below the header's line.
    const cta = document.getElementById('hero-cta');
    const hero = cta?.closest('section');
    if (cta && hero) {
      stops.push(
        watchInView(
          hero,
          (entry) => {
            const line = entry.rootBounds?.top ?? 57;
            if (cta.getBoundingClientRect().bottom > line) onScreen.add('hero-cta');
            else onScreen.delete('hero-cta');
            setBlocked(onScreen.size > 0);
          },
          SECTION_WATCH,
        ),
      );
    }
    return () => {
      for (const stop of stops) stop();
    };
  }, []);

  useEffect(() => {
    // focusout names where focus goes next, so a move from one field to another never flickers.
    const onFocusIn = (event: FocusEvent) => setTyping(isTypingField(event.target));
    const onFocusOut = (event: FocusEvent) => setTyping(isTypingField(event.relatedTarget));
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const visible = !blocked && !typing && !demoBusy;

  return (
    // A landmark of its own: the bar sits after the footer, outside banner, main and contentinfo.
    <aside
      className={styles.bar}
      aria-label="Tezkor ariza"
      data-visible={visible || undefined}
      inert={!visible}
      aria-hidden={visible ? undefined : true}
    >
      <Button variant="secondary" size="lg" block className={styles.action} onClick={onApply}>
        {label}
      </Button>
    </aside>
  );
}
