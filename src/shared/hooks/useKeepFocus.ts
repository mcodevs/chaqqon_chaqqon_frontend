import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps the keyboard on the field a screen is waiting for.
 *
 * `autoFocus` fires once, when the field mounts. After that a single click on anything that
 * cannot take focus — a panel, a heading, the background — leaves focus on `<body>` and every
 * keystroke is swallowed, with no sign of why. On a projector it is worse: fullscreen hides the
 * mouse pointer after a few idle seconds, so the teacher cannot even see where to click back.
 *
 * This puts focus on the field when it appears and puts it back whenever focus is dropped to
 * nothing. Focus moving to another control (a button, the next field) is left alone, and so is
 * the window losing focus to another app.
 */
export function useKeepFocus(getTarget: () => HTMLElement | null | undefined): void {
  const getTargetRef = useRef(getTarget);

  useLayoutEffect(() => {
    getTargetRef.current = getTarget;
  });

  useEffect(() => {
    getTargetRef.current()?.focus();

    const restore = (event: FocusEvent) => {
      // A real control took over; that is a focus move, not a focus loss.
      if (event.relatedTarget !== null) return;
      // Let the click finish first: it may yet land on something focusable.
      queueMicrotask(() => {
        if (!document.hasFocus()) return;
        const active = document.activeElement;
        if (active !== null && active !== document.body) return;
        getTargetRef.current()?.focus();
      });
    };

    document.addEventListener('focusout', restore);
    return () => document.removeEventListener('focusout', restore);
  }, []);
}
