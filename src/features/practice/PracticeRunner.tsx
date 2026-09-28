import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import type { PracticeConfig } from '@/domain/practice/config';
import type { Problem } from '@/domain/practice/problem';
import { countCorrect, currentProblem, lastAttempt } from '@/domain/practice/session';
import { useFlashSession } from './useFlashSession';
import { AnswerView } from './views/AnswerView';
import { FeedbackView } from './views/FeedbackView';
import { FlashView } from './views/FlashView';
import { SummaryView } from './views/SummaryView';

export interface PracticeProgress {
  answered: number;
  correct: number;
  total: number;
  finished: boolean;
}

interface PracticeRunnerProps {
  problems: readonly Problem[];
  /** The config the problems were built from; it also decides how they are shown. */
  config: PracticeConfig;
  onProgress?: (progress: PracticeProgress) => void;
  /** Rendered under the score once the session is over. */
  summaryActions?: ReactNode;
}

/** A solo session: one lane, answered by the student, moving on by itself after a correct answer. */
export function PracticeRunner({ problems, config, onProgress, summaryActions }: PracticeRunnerProps) {
  const { state, submitAnswers, next } = useFlashSession({
    problemSets: [problems],
    secondsPerNumber: config.secondsPerNumber,
    autoAdvance: true,
  });
  const onProgressRef = useRef(onProgress);

  useLayoutEffect(() => {
    onProgressRef.current = onProgress;
  });

  const [lane] = state.lanes;
  const total = problems.length;
  const answered = lane.attempts.length;
  const correct = countCorrect(state);
  const finished = state.phase === 'finished';

  // Fires only when an answer lands or the session ends, not on every phase change.
  useEffect(() => {
    if (answered === 0) return;
    onProgressRef.current?.({ answered, correct, total, finished });
  }, [answered, correct, total, finished]);

  const position = { problemNumber: state.round + 1, problemCount: total };

  switch (state.phase) {
    case 'ready':
    case 'showing':
    case 'gap':
      return (
        <FlashView
          {...position}
          config={config}
          phase={state.phase}
          numbers={currentProblem(state).numbers}
          numberIndex={state.numberIndex}
        />
      );
    case 'answering':
      return (
        <AnswerView
          key={state.round}
          kind={config.kind}
          {...position}
          onSubmit={(answer) => submitAnswers([answer])}
        />
      );
    case 'feedback': {
      const attempt = lastAttempt(state);
      if (!attempt) return null;
      return (
        <FeedbackView
          config={config}
          attempt={attempt}
          isLast={position.problemNumber === total}
          onNext={next}
        />
      );
    }
    case 'finished':
      return <SummaryView kind={config.kind} attempts={lane.attempts} actions={summaryActions} />;
  }
}
