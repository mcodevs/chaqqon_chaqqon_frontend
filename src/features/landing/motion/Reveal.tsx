import { type CSSProperties, type HTMLAttributes, type ReactNode, useLayoutEffect, useRef } from 'react';
import { supportsInView, watchInView } from './useInView';
import motion from './motion.module.css';

/** Later items wait at most this many stagger steps, so a long list never lags behind the scroll. */
const MAX_STAGGER = 5;

/*
 * Revealed as soon as the top edge is a little way on screen. No share-of-element threshold: a tall
 * group could never show 15% of itself on a short phone and would stay hidden.
 */
const REVEAL_WATCH = { threshold: 0, rootMargin: '0px 0px -8% 0px' } as const;

type RevealTag = 'div' | 'li' | 'article' | 'section' | 'ul' | 'ol' | 'header' | 'p' | 'figure';

interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** The element to render; a div by default. */
  as?: RevealTag;
  /** Position in a row of siblings: each step waits one `--lp-stagger` longer, up to five. */
  index?: number;
  children?: ReactNode;
}

/**
 * Lets content that starts below the fold rise in as it scrolls into view. It is visible by default:
 * only the landing's motion gate plus "motion allowed" hide it, so without JS, IntersectionObserver
 * or motion it simply is there. The state lives in `data-reveal`, written on the DOM node and never
 * through props, so a re-render cannot reset it.
 *
 * Never wrap the hero, the form card or a hash target in it. While the element rises, Reveal sets
 * its opacity, transform and transition; it drops its attribute when the rise ends, so the
 * element's own transitions (a hover lift) take over from then on.
 */
export function Reveal({ as = 'div', index = 0, className, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !supportsInView()) return;
    // Anything on screen at first paint stays put: only what starts below the fold waits.
    if (element.getBoundingClientRect().top <= window.innerHeight) return;

    element.dataset.reveal = 'pending';
    // Once risen, the attribute goes, so the element's own transitions are its own again.
    const settle = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === 'opacity') delete element.dataset.reveal;
    };
    element.addEventListener('transitionend', settle);
    const stop = watchInView(
      element,
      (entry, stopWatching) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = 'done';
        stopWatching();
      },
      REVEAL_WATCH,
    );

    return () => {
      stop();
      element.removeEventListener('transitionend', settle);
    };
  }, []);

  // Every allowed tag is an HTMLElement; typing the tag as a div keeps the ref and props simple.
  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      className={className ? `${motion.reveal} ${className}` : motion.reveal}
      style={{ '--i': Math.min(index, MAX_STAGGER), ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
