import { useState } from 'react';
import type { DuelProgress } from '@/application/duelService';
import { useCurrentStudent } from '@/features/student/CurrentStudentContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useDuelInbox, useStudents } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import styles from './Duel.module.css';
import { DuelInvite } from './DuelInvite';
import { DuelLobby } from './DuelLobby';
import { DuelRun } from './DuelRun';
import { DuelStandings } from './DuelStandings';
import { DuelSetupForm } from './DuelSetupForm';

/**
 * The student's own competition. One screen for all of it: the duel they are in, the invitations
 * waiting for them, and the form to open a new one.
 */
export function StudentDuelPage() {
  const me = useCurrentStudent();
  const students = useStudents();
  const inbox = useDuelInbox(me.id);
  const { duels } = useServices();
  /** A finished duel stays on screen until it is closed, so the places can be read. */
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const open = useAsyncAction(duels.open);
  const join = useAsyncAction(duels.join);
  const start = useAsyncAction(duels.start);
  const nextRound = useAsyncAction(duels.nextRound);
  const finish = useAsyncAction(duels.finish);

  if (!inbox || !students) return <LoadingScreen />;

  const active = inbox.active && inbox.active.duel.id !== dismissedId ? inbox.active : null;
  const classmates = students.filter((student) => student.id !== me.id);

  if (active) {
    const { duel } = active;
    const report = (progress: DuelProgress) => {
      // A dropped report is picked up by the next answer; nothing for the child to do about it.
      void duels.reportProgress(duel.id, me.id, progress).catch((caught: unknown) => console.error(caught));
    };

    if (duel.status === 'lobby') {
      return (
        <DuelLobby
          snapshot={active}
          students={students}
          me={me}
          pending={start.pending || finish.pending}
          error={start.error ?? finish.error}
          onStart={() => void start.run(duel.id)}
          onCancel={() => void finish.run(duel.id)}
          onDismiss={() => setDismissedId(duel.id)}
        />
      );
    }

    if (duel.status === 'running') {
      return (
        <DuelRun
          key={duel.id}
          snapshot={active}
          students={students}
          me={me}
          pending={nextRound.pending || finish.pending}
          error={nextRound.error ?? finish.error}
          onNext={() => void nextRound.run(duel.id)}
          onStop={() => void finish.run(duel.id)}
          onProgress={report}
        />
      );
    }

    return (
      <Card title="Bellashuv yakunlandi!">
        <DuelStandings duel={duel} participants={active.participants} students={students} />
        <p className={styles.note}>
          Bellashuv uchun yulduzcha berilmaydi va reytingga qo'shilmaydi — natija "Natijalarim"da saqlanadi.
        </p>
        <Button size="lg" block onClick={() => setDismissedId(duel.id)}>
          Yopish
        </Button>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      {inbox.invites.map((invite) => (
        <DuelInvite
          key={invite.duel.id}
          snapshot={invite}
          students={students}
          me={me}
          pending={join.pending}
          onJoin={() => void join.run(invite.duel.id, me.id)}
        />
      ))}
      <ErrorMessage>{join.error}</ErrorMessage>

      {classmates.length === 0 ? (
        <Card title="Bellashuv">
          <EmptyState icon="⚔️" title="Hozircha sinfdosh yo'q">
            Bellashuv uchun sinfda kamida bitta sinfdosh bo'lishi kerak.
          </EmptyState>
        </Card>
      ) : (
        <DuelSetupForm
          classmates={classmates}
          me={me}
          pending={open.pending}
          error={open.error}
          onOpen={({ guestIds, configs, sameConfig }) =>
            void open.run({ hostId: me.id, guestIds, configs, sameConfig })
          }
        />
      )}
    </div>
  );
}
