import { DUEL_PARTICIPANTS } from '@/domain/duel';
import type { DuelSnapshot } from '@/application/duelService';
import { type Student, fullName } from '@/domain/users';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Duel.module.css';
import { duelSummary } from './duelText';
import { DuelRoster } from './DuelRoster';

interface DuelLobbyProps {
  snapshot: DuelSnapshot;
  students: readonly Student[];
  me: Student;
  pending: boolean;
  error: string | null;
  onStart: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

/** Waiting for classmates: the host starts it, everyone else watches the list fill up. */
export function DuelLobby({
  snapshot,
  students,
  me,
  pending,
  error,
  onStart,
  onCancel,
  onDismiss,
}: DuelLobbyProps) {
  const { duel, participants } = snapshot;
  const isHost = duel.hostId === me.id;
  const host = students.find((student) => student.id === duel.hostId);
  const missing = DUEL_PARTICIPANTS.min - participants.length;

  return (
    <Card title={isHost ? 'Bellashuv tayyor' : `${host?.firstName ?? 'Sinfdoshingiz'} bellashuvga chaqirdi`}>
      <p className={styles.summary}>{duelSummary(duel, duel.configs[me.id] ?? duel.configs[duel.hostId])}</p>
      {!duel.sameConfig && (
        <p className={styles.hint}>Har kimning sozlamasi o'zicha, shuning uchun misollar ham har xil.</p>
      )}

      <DuelRoster duel={duel} participants={participants} students={students} meId={me.id} />

      <ErrorMessage>{error}</ErrorMessage>

      {isHost ? (
        <>
          <Button size="lg" block disabled={missing > 0 || pending} onClick={onStart}>
            {missing > 0 ? 'Kamida bitta sinfdosh qo‘shilishini kutamiz' : 'Boshlash!'}
          </Button>
          <Button variant="outline" tone="danger" block onClick={onCancel}>
            Bekor qilish
          </Button>
        </>
      ) : (
        <>
          <p className={styles.waiting} role="status">
            {host ? fullName(host) : 'Boshlovchi'} boshlaganda musobaqa o'zi ishga tushadi — sahifadan
            chiqmang.
          </p>
          <Button variant="outline" block onClick={onDismiss}>
            Yopish
          </Button>
        </>
      )}
    </Card>
  );
}
