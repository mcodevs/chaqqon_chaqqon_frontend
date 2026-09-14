import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
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
  secondsPerNumber: number;
  onProgress?: (progress: PracticeProgress) => void;
  /** Rendered under the score once the session is over. */
  summaryActions?: ReactNode;
}

/** A solo session: one lane, answered by the student, moving on by itself after a correct answer. */
export function PracticeRunner({
  problems,
  secondsPerNumber,
  onProgress,
  summaryActions,
}: PracticeRunnerProps) {
  const { state, submitAnswers, next } = useFlashSession({
    problemSets: [problems],
    secondsPerNumber,
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
          phase={state.phase}
          numbers={currentProblem(state).numbers}
          numberIndex={state.numberIndex}
          secondsPerNumber={secondsPerNumber}
        />
      );
    case 'answering':
      return <AnswerView key={state.round} {...position} onSubmit={(answer) => submitAnswers([answer])} />;
    case 'feedback': {
      const attempt = lastAttempt(state);
      if (!attempt) return null;
      return <FeedbackView attempt={attempt} isLast={position.problemNumber === total} onNext={next} />;
    }
    case 'finished':
      return <SummaryView attempts={lane.attempts} actions={summaryActions} />;
  }
}
