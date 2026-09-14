import { useState } from 'react';
import type { Room } from '@/domain/competition';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { generateProblems } from '@/domain/practice/problem';
import { type PracticeProgress, PracticeRunner } from '@/features/practice/PracticeRunner';
import { toErrorMessage } from '@/shared/i18n/errorMessages';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';

interface CompetitionRunProps {
  room: Room;
  studentId: string;
  onFinished: () => void;
  onDismiss: () => void;
}

export function CompetitionRun({ room, studentId, onFinished, onDismiss }: CompetitionRunProps) {
  const { competition, results } = useServices();
  const config = room.configs[studentId] ?? DEFAULT_PRACTICE_CONFIG;
  const [problems] = useState(() => generateProblems(config, Math.random));
  const [error, setError] = useState<string | null>(null);

  const handleProgress = async ({ answered, correct, total, finished }: PracticeProgress) => {
    try {
      if (finished) {
        onFinished();
        await results.record({ studentId, config, correct, total, mode: 'online', roomId: room.id });
      }
      await competition.reportProgress(room.id, studentId, { answered, correct, finished });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  return (
    <PracticeRunner
      problems={problems}
      secondsPerNumber={config.secondsPerNumber}
      onProgress={handleProgress}
      summaryActions={
        <>
          <ErrorMessage>{error}</ErrorMessage>
          <Button tone="violet" block onClick={onDismiss}>
            Yopish
          </Button>
        </>
      }
    />
  );
}
