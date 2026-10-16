import type { Duel, DuelParticipant } from '@/domain/duel';
import { hasAnsweredRound } from '@/domain/duel';
import type { Student } from '@/domain/users';
import { Button } from '@/shared/ui/Button';
import styles from './Duel.module.css';

interface DuelHostControlsProps {
  duel: Duel;
  participants: readonly DuelParticipant[];
  students: readonly Student[];
  isLastRound: boolean;
  pending: boolean;
  onNext: () => void;
  onStop: () => void;
}

/**
 * The host's strip: who has already answered this round, and the button that moves everyone on.
 * It appears once answers can land, so nothing sits under the numbers while they flash.
 */
export function DuelHostControls({
  duel,
  participants,
  students,
  isLastRound,
  pending,
  onNext,
  onStop,
}: DuelHostControlsProps) {
  const isCard = (duel.configs[duel.hostId]?.kind ?? 'anzan') === 'soroban';

  return (
    <footer className={styles.hostStrip}>
      <ul className={styles.hostList}>
        {participants.map((participant) => {
          const answered = hasAnsweredRound(participant, duel);
          const student = students.find((candidate) => candidate.id === participant.studentId);
          return (
            <li key={participant.studentId} className={styles.hostChip} data-answered={answered}>
              <span className={styles.hostChipName}>{student?.firstName ?? "O'quvchi"}</span>
              <span aria-hidden="true">{answered ? '✓' : '…'}</span>
              <span className={styles.hostChipScore}>{participant.correct}</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.hostActions}>
        <Button disabled={pending} onClick={onNext}>
          {isLastRound ? 'Natijalar' : isCard ? 'Keyingi karta' : 'Keyingi misol'}
        </Button>
        <Button size="sm" variant="outline" tone="danger" onClick={onStop}>
          To'xtatish
        </Button>
      </div>
    </footer>
  );
}
