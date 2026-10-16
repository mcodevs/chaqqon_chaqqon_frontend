import { type Duel, isDuelStale } from '@/domain/duel';
import { fullName } from '@/domain/users';
import { formatDate } from '@/shared/format';
import { useClassDuels, useStudents } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './Duel.module.css';
import { duelSummary, formatTimeOfDay } from './duelText';
import { DuelStandings } from './DuelStandings';

const STATUS_LABEL: Record<Duel['status'], string> = {
  lobby: 'Kutilmoqda',
  running: 'Ketmoqda',
  finished: 'Yakunlandi',
};

/**
 * What the class has been playing on its own. The teacher does not run these and cannot step into
 * one; this is the record of who played whom, with what settings, and how it ended.
 */
export function TeacherDuelsPage() {
  const duels = useClassDuels();
  const students = useStudents();

  if (!duels || !students)
    return (
      <Card title="Bellashuvlar">
        <SkeletonList rows={4} />
      </Card>
    );

  if (duels.length === 0) {
    return (
      <Card title="Bellashuvlar">
        <EmptyState icon="⚔️" title="Hozircha bellashuv yo'q">
          O'quvchilar o'z telefonidan sinfdoshlarini bellashuvga chaqirganda, natijalari shu yerda ko'rinadi.
          Yulduzcha berilmaydi va reytingga qo'shilmaydi.
        </EmptyState>
      </Card>
    );
  }

  const now = new Date();

  return (
    <div className={styles.page}>
      {duels.map(({ duel, participants }) => {
        const host = students.find((student) => student.id === duel.hostId);
        const stale = isDuelStale(duel, now);
        return (
          <Card
            key={duel.id}
            title={`${host ? fullName(host) : "O'quvchi"} · ${formatDate(duel.createdAt)}, ${formatTimeOfDay(duel.createdAt)}`}
            actions={
              <span className={styles.rosterMark}>
                {stale ? 'Tashlab ketilgan' : STATUS_LABEL[duel.status]}
              </span>
            }
          >
            <p className={styles.summary}>
              {duelSummary(duel, duel.configs[duel.hostId])}
              {!duel.sameConfig && " · har kimda o'z sozlamasi"}
            </p>
            <DuelStandings duel={duel} participants={participants} students={students} />
          </Card>
        );
      })}
    </div>
  );
}
