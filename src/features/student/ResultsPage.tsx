import { useMemo, useState } from 'react';
import { type PracticeMode, accuracyPercent } from '@/domain/results';
import {
  type TimeRange,
  computeStudentStats,
  filterResultsByRange,
} from '@/domain/statistics';
import { SECTION_META } from '@/features/practice/sections';
import { formatDate } from '@/shared/format';
import { useResults, useSchoolToday } from '@/shared/services/queries';
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
  const today = useSchoolToday();
  const [range, setRange] = useState<TimeRange>('week');

  const studentResults = useMemo(() => {
    if (!results) return [];
    return results
      .filter((result) => result.studentId === student.id)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [results, student.id]);

  const filteredResults = useMemo(
    () => filterResultsByRange(studentResults, range, today),
    [studentResults, range, today],
  );

  const stats = useMemo(() => computeStudentStats(filteredResults), [filteredResults]);

  if (!results) return <LoadingScreen />;

  const maxDailyTotal = Math.max(...stats.dailyActivity.map((d) => d.total), 1);

  return (
    <div className={styles.container}>
      {/* 1. Vaqt oralig'i filtri */}
      <div className={styles.rangeTabs} role="tablist">
        <button
          type="button"
          className={`${styles.rangeTab} ${range === 'week' ? styles.rangeTabActive : ''}`}
          onClick={() => setRange('week')}
        >
          1 hafta (7 kun)
        </button>
        <button
          type="button"
          className={`${styles.rangeTab} ${range === 'month' ? styles.rangeTabActive : ''}`}
          onClick={() => setRange('month')}
        >
          1 oy (30 kun)
        </button>
        <button
          type="button"
          className={`${styles.rangeTab} ${range === 'all' ? styles.rangeTabActive : ''}`}
          onClick={() => setRange('all')}
        >
          Barcha vaqt
        </button>
      </div>

      {/* 2. Asosiy KPI bloklari */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>
            {stats.totalSessions > 0 ? `${stats.accuracy}%` : '—'}
          </div>
          <div className={styles.kpiLabel}>Aniqlik</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
            {stats.totalSessions} ta
          </div>
          <div className={styles.kpiLabel}>Mashqlar</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-violet)' }}>
            {stats.totalCorrect} / {stats.totalProblems}
          </div>
          <div className={styles.kpiLabel}>To'g'ri misol</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-orange)' }}>
            {stats.averageSecondsPerNumber > 0 ? `${stats.averageSecondsPerNumber} s` : '—'}
          </div>
          <div className={styles.kpiLabel}>O'rtacha tezlik</div>
        </div>
      </div>

      {/* 3. Formulalar / Mavzular bo'yicha tahlil */}
      {stats.totalSessions > 0 && (
        <Card title="Mavzular bo'yicha aniqlik">
          <div className={styles.sectionList}>
            {Object.entries(stats.bySection).map(([sectionId, sec]) => {
              const meta = SECTION_META[sec.section];
              const percent = sec.total > 0 ? sec.accuracy : 0;
              const color = toneColor(meta.tone);
              return (
                <div key={sectionId} className={styles.sectionItem}>
                  <div className={styles.sectionItemHeader}>
                    <span className={styles.sectionName}>{meta.label}</span>
                    <span className={styles.sectionStats}>
                      {sec.sessions > 0
                        ? `${percent}% (${sec.correct}/${sec.total} to'g'ri)`
                        : "Ishlanmagan"}
                    </span>
                  </div>
                  <div className={styles.sectionTrack}>
                    <div
                      className={styles.sectionFill}
                      style={{
                        width: `${percent}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. Kunlik faollik diagrammasi */}
      {stats.dailyActivity.length > 0 && (
        <Card title="Kunlik mashqlar grafigi">
          <div className={styles.chartContainer}>
            {stats.dailyActivity.map((day) => {
              const heightPercent = Math.max(Math.round((day.total / maxDailyTotal) * 100), 8);
              const formattedDate = day.date.slice(5); // MM-DD
              return (
                <div key={day.date} className={styles.chartColumn} title={`${day.date}: ${day.correct}/${day.total} to'g'ri (${day.accuracy}%)`}>
                  <span className={styles.chartValue}>{day.total}</span>
                  <div className={styles.barWrapper}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${heightPercent}%`,
                        background:
                          day.accuracy >= 80
                            ? 'var(--color-success)'
                            : day.accuracy >= 50
                              ? 'var(--color-orange)'
                              : 'var(--color-danger)',
                      }}
                    />
                  </div>
                  <span className={styles.chartDate}>{formattedDate}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 5. Natijalar tarixi */}
      <Card title="Mashqlar tarixi">
        {filteredResults.length === 0 && (
          <EmptyState>Ushbu davrda natijalar mavjud emas.</EmptyState>
        )}
        <ul className={styles.list}>
          {filteredResults.map((result) => {
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
                    {section.label} · {result.config.rowCount} qator · {result.config.secondsPerNumber}s
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
    </div>
  );
}
