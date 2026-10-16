import type { DuelSnapshot } from '@/application/duelService';
import { type Student, fullName } from '@/domain/users';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import styles from './Duel.module.css';
import { duelSummary } from './duelText';
import { DuelRoster } from './DuelRoster';

interface DuelInviteProps {
  snapshot: DuelSnapshot;
  students: readonly Student[];
  me: Student;
  pending: boolean;
  onJoin: () => void;
}

/** An invitation waiting to be taken up: who is already in, and what they are about to play. */
export function DuelInvite({ snapshot, students, me, pending, onJoin }: DuelInviteProps) {
  const { duel, participants } = snapshot;
  const host = students.find((student) => student.id === duel.hostId);

  return (
    <Card title={`${host ? fullName(host) : 'Sinfdoshingiz'} bellashuvga chaqirdi`}>
      <p className={styles.summary}>{duelSummary(duel, duel.configs[me.id] ?? duel.configs[duel.hostId])}</p>
      <DuelRoster duel={duel} participants={participants} students={students} meId={me.id} />
      <Button size="lg" block disabled={pending} onClick={onJoin}>
        Qo'shilish
      </Button>
    </Card>
  );
}
