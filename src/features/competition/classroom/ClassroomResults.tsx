import { type LaneScore, rankScores } from '@/domain/classroom';
import { type Student, fullName } from '@/domain/users';
import { Button } from '@/shared/ui/Button';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Classroom.module.css';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface SaveState {
  pending: boolean;
  saved: boolean;
  error: string | null;
}

interface ClassroomResultsProps {
  participants: readonly Student[];
  scores: readonly LaneScore[];
  save: SaveState;
  onRetrySave: () => void;
  onRematch: () => void;
  onClose: () => void;
}

export function ClassroomResults({
  participants,
  scores,
  save,
  onRetrySave,
  onRematch,
  onClose,
}: ClassroomResultsProps) {
  return (
    <div className={styles.results}>
      <h2 className={styles.resultsTitle}>Musobaqa yakunlandi!</h2>

      <ol className={styles.ranking}>
        {rankScores(scores).map((score) => {
          const student = participants.find((participant) => participant.id === score.studentId);
          return (
            <li key={score.studentId} className={styles.rankRow} data-place={score.place}>
              <span className={styles.place} aria-label={`${score.place}-o'rin`}>
                {MEDALS[score.place] ?? score.place}
              </span>
              <NameAvatar name={student?.firstName ?? '?'} avatarUrl={student?.avatarUrl} size={48} />
              <span className={styles.rankName}>{student ? fullName(student) : "O'quvchi"}</span>
              <span className={styles.rankScore}>
                {score.correct}/{score.total}
              </span>
            </li>
          );
        })}
      </ol>

      <div role="status" className={styles.saveStatus}>
        {save.pending && 'Natijalar saqlanmoqda…'}
        {save.saved && 'Natijalar reytingga saqlandi ✓'}
      </div>
      {save.error && (
        <div className={styles.saveError}>
          <ErrorMessage>{save.error}</ErrorMessage>
          <Button size="sm" variant="soft" tone="coral" onClick={onRetrySave}>
            Qayta saqlash
          </Button>
        </div>
      )}

      <div className={styles.resultActions}>
        <Button tone="violet" disabled={save.pending} onClick={onRematch}>
          Yana o'ynash
        </Button>
        <Button variant="outline" onClick={onClose}>
          Yopish
        </Button>
      </div>
    </div>
  );
}
