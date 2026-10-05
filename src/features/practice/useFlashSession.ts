import { useEffect, useReducer } from 'react';
import type { Problem } from '@/domain/practice/problem';
import { createSession, sessionReducer, timedTransition } from '@/domain/practice/session';

interface Options {
  /** One problem list per lane; lanes must be in step (see `createSession`). */
  problemSets: readonly (readonly Problem[])[];
  secondsPerNumber: number;
  autoAdvance: boolean;
  /** False for the column drill, whose problem is read rather than flashed. */
  flashed?: boolean;
}

/** Runs a flash session's timed phases; answers and "next" come from the caller. */
export function useFlashSession({ problemSets, secondsPerNumber, autoAdvance, flashed = true }: Options) {
  const [state, dispatch] = useReducer(sessionReducer, problemSets, (sets) =>
    createSession(sets, { flashed }),
  );

  // The reducer returns the same state for ignored actions, so this reschedules only on real transitions.
  useEffect(() => {
    const transition = timedTransition(state, { secondsPerNumber, autoAdvance });
    if (!transition) return;
    const timer = window.setTimeout(() => dispatch(transition.action), transition.delayMs);
    return () => window.clearTimeout(timer);
  }, [state, secondsPerNumber, autoAdvance]);

  return {
    state,
    submitAnswers: (answers: readonly (number | null)[]) => dispatch({ type: 'answersSubmitted', answers }),
    next: () => dispatch({ type: 'nextRequested' }),
  };
}
