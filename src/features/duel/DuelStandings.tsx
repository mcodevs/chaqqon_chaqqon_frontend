import { type Duel, type DuelParticipant, rankDuel } from '@/domain/duel';
import { type Student, fullName } from '@/domain/users';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import styles from './Duel.module.css';
import { formatAnswerTime } from './duelText';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface DuelStandingsProps {
  duel: Duel;
  participants: readonly DuelParticipant[];
  students: readonly Student[];
}

/** Final places: correct answers first, then the time spent answering. */
export function DuelStandings({ duel, participants, students }: DuelStandingsProps) {
  return (
    <ol className={styles.standings}>
      {rankDuel(participants).map((standing) => {
        const student = students.find((candidate) => candidate.id === standing.studentId);
        return (
          <li key={standing.studentId} className={styles.standingRow} data-place={standing.place}>
            <span className={styles.place} aria-label={`${standing.place}-o'rin`}>
              {MEDALS[standing.place] ?? standing.place}
            </span>
            <NameAvatar name={student?.firstName ?? '?'} avatarUrl={student?.avatarUrl} size={44} />
            <span className={styles.standingName}>{student ? fullName(student) : "O'quvchi"}</span>
            <span className={styles.standingScore}>
              {standing.correct}/{standing.answered || duel.roundCount}
              <span className={styles.standingTime}>{formatAnswerTime(standing.answerMs)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
