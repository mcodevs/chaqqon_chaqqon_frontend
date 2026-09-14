import { type PracticeMode, accuracyPercent } from '@/domain/results';
import { SECTION_META } from '@/features/practice/sections';
import { formatDate } from '@/shared/format';
import { useResults } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import { toneColor } from '@/shared/ui/tone';
import { useCurrentStudent } from './CurrentStudentContext';
import styles from './ResultsPage.module.css';

const MODE_BADGES: Partial<Record<PracticeMode, { icon: string; label: string }>> = {
  online: { icon: '🏆', label: 'Onlayn musobaqa' },
  classroom: { icon: '🏫', label: 'Sinf musobaqasi' },
};

export function ResultsPage() {
  const student = useCurrentStudent();
  const results = useResults();

  if (!results) return <LoadingScreen />;

  const myResults = results
    .filter((result) => result.studentId === student.id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <Card title="Mening natijalarim">
      {myResults.length === 0 && <EmptyState>Hali mashq qilmadingiz.</EmptyState>}
      <ul className={styles.list}>
        {myResults.map((result) => {
          const section = SECTION_META[result.config.section];
          const badge = MODE_BADGES[result.mode];
          return (
            <li key={result.id} className={styles.row}>
              <span className={styles.badge} style={{ background: toneColor(section.tone) }}>
                {accuracyPercent(result.correct, result.total)}%
              </span>
              <div>
                <div className={styles.title}>
                  {badge && (
                    <span role="img" aria-label={badge.label}>
                      {badge.icon}{' '}
                    </span>
                  )}
                  {section.label} · {result.config.rowCount} qator
                </div>
                <div className={styles.meta}>
                  {result.correct}/{result.total} to'g'ri · {formatDate(result.completedAt)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
