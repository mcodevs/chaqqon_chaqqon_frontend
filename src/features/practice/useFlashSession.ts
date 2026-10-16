import { useCallback, useEffect, useReducer } from 'react';
import type { Problem } from '@/domain/practice/problem';
import { type SessionState, createSession, sessionReducer, timedTransition } from '@/domain/practice/session';

interface Options {
  /** One problem list per lane; lanes must be in step (see `createSession`). */
  problemSets: readonly (readonly Problem[])[];
  secondsPerNumber: number;
  autoAdvance: boolean;
  /** False for the column drill, whose problem is read rather than flashed. */
  flashed?: boolean;
  /**
   * Rounds that were already over when the session started; they count as missed. A duel reopened
   * mid-match starts at the round everyone else is on, not back at the first problem.
   */
  startRound?: number;
}

/** Only the initializer sees these, so a later change to `startRound` cannot rewind a session. */
function startSession({
  problemSets,
  flashed,
  startRound,
}: Required<Omit<Options, 'secondsPerNumber' | 'autoAdvance'>>): SessionState {
  let state = createSession(problemSets, { flashed });
  for (let round = 0; round < startRound; round += 1) {
    state = sessionReducer(sessionReducer(state, { type: 'roundSkipped' }), { type: 'nextRequested' });
  }
  return state;
}

/** Runs a flash session's timed phases; answers and "next" come from the caller. */
export function useFlashSession({
  problemSets,
  secondsPerNumber,
  autoAdvance,
  flashed = true,
  startRound = 0,
}: Options) {
  const [state, dispatch] = useReducer(sessionReducer, { problemSets, flashed, startRound }, startSession);

  // The reducer returns the same state for ignored actions, so this reschedules only on real transitions.
  useEffect(() => {
    const transition = timedTransition(state, { secondsPerNumber, autoAdvance });
    if (!transition) return;
    const timer = window.setTimeout(() => dispatch(transition.action), transition.delayMs);
    return () => window.clearTimeout(timer);
  }, [state, secondsPerNumber, autoAdvance]);

  // Stable callbacks: a duel syncs rounds from an effect, which would otherwise re-run on every render.
  const submitAnswers = useCallback(
    (answers: readonly (number | null)[]) => dispatch({ type: 'answersSubmitted', answers }),
    [],
  );
  /** The round is over without an answer from this lane: a duel's host moved everyone on. */
  const skip = useCallback(() => dispatch({ type: 'roundSkipped' }), []);
  const next = useCallback(() => dispatch({ type: 'nextRequested' }), []);

  return { state, submitAnswers, skip, next };
}
