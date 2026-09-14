import { useMemo } from 'react';
import { computeLeaderboard } from '@/domain/leaderboard';
import { fullName } from '@/domain/users';
import { useResults, useStudents } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './LeaderboardPage.module.css';

const MEDAL_CLASSES = [styles.gold, styles.silver, styles.bronze];

export function LeaderboardPage() {
  const students = useStudents();
  const results = useResults();
  const rows = useMemo(
    () => (students && results ? computeLeaderboard(students, results) : undefined),
    [students, results],
  );

  if (!rows) return <LoadingScreen />;

  return (
    <Card title="Sinf reytingi">
      {rows.length === 0 && <EmptyState>Hali natijalar yo'q.</EmptyState>}
      <ol className={styles.list}>
        {rows.map((row, index) => (
          <li key={row.student.id} className={styles.row}>
            <span className={`${styles.rank} ${MEDAL_CLASSES[index] ?? ''}`}>{index + 1}</span>
            <NameAvatar name={row.student.firstName} />
            <div className={styles.name}>
              <div className={styles.nameMain}>{fullName(row.student)}</div>
              <div className={styles.nameSub}>{row.sessions} ta mashq</div>
            </div>
            <span className={styles.score}>{row.sessions > 0 ? `${row.accuracy}%` : '—'}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
