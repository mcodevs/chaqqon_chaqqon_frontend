import type { Duel, DuelParticipant } from '@/domain/duel';
import { type Student, fullName } from '@/domain/users';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import styles from './Duel.module.css';

interface DuelRosterProps {
  duel: Duel;
  participants: readonly DuelParticipant[];
  students: readonly Student[];
  /** Marks whoever is reading it, so a child finds themselves in the list at a glance. */
  meId: string;
}

/**
 * Who is in the duel, live. Everyone the host invited is listed from the start, so a child sees
 * both the classmates already in and the ones still being waited for — before and after joining.
 */
export function DuelRoster({ duel, participants, students, meId }: DuelRosterProps) {
  const nameOf = (id: string) => {
    const student = students.find((candidate) => candidate.id === id);
    return student ? fullName(student) : "O'quvchi";
  };

  return (
    <ul className={styles.roster}>
      {duel.invitedIds.map((id) => {
        const joined = participants.some((participant) => participant.studentId === id);
        const student = students.find((candidate) => candidate.id === id);
        return (
          <li key={id} className={styles.rosterRow} data-joined={joined}>
            <NameAvatar name={student?.firstName ?? '?'} avatarUrl={student?.avatarUrl} size={36} />
            <span className={styles.rosterName}>
              {nameOf(id)}
              {id === meId && <span className={styles.rosterTag}> · siz</span>}
              {id === duel.hostId && <span className={styles.rosterTag}> · boshlovchi</span>}
            </span>
            <span className={styles.rosterMark}>{joined ? '✓ qo‘shildi' : 'kutilmoqda…'}</span>
          </li>
        );
      })}
    </ul>
  );
}
