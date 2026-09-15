import { useMemo, useState } from 'react';
import { type TimeRange, computeClassroomStats } from '@/domain/statistics';
import { fullName } from '@/domain/users';
import { SECTION_META } from '@/features/practice/sections';
import { useResults, useSchoolToday, useStudents } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { EmptyState } from '@/shared/ui/Notice';
import { toneColor } from '@/shared/ui/tone';
import styles from './TeacherStatsPage.module.css';

export function TeacherStatsPage() {
  const students = useStudents();
  const results = useResults();
  const today = useSchoolToday();
  const [range, setRange] = useState<TimeRange>('week');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const classroom = useMemo(() => {
    if (!students || !results) return undefined;
    return computeClassroomStats(students, results, range, today);
  }, [students, results, range, today]);

  if (!classroom) return <LoadingScreen />;

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

      {/* 2. Sinf bo'yicha umumiy KPI */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>
            {classroom.totalSessions > 0 ? `${classroom.accuracy}%` : '—'}
          </div>
          <div className={styles.kpiLabel}>Sinf aniqligi</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
            {classroom.activeStudentsCount} / {classroom.students.length}
          </div>
          <div className={styles.kpiLabel}>Faol o'quvchilar</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-violet)' }}>
            {classroom.totalSessions} ta
          </div>
          <div className={styles.kpiLabel}>Jami mashqlar</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue} style={{ color: 'var(--color-orange)' }}>
            {classroom.totalCorrect} / {classroom.totalProblems}
          </div>
          <div className={styles.kpiLabel}>To'g'ri misollar</div>
        </div>
      </div>

      {/* 3. O'quvchilar kesimida tahlil */}
      <Card title="O'quvchilar bo'yicha statistika">
        {classroom.students.length === 0 && (
          <EmptyState>O'quvchilar mavjud emas.</EmptyState>
        )}
        <div className={styles.studentList}>
          {classroom.students.map(({ student, stats }) => {
            const isSelected = selectedStudentId === student.id;
            const accuracyColor =
              stats.totalSessions === 0
                ? 'var(--color-muted)'
                : stats.accuracy >= 80
                  ? 'var(--color-success)'
                  : stats.accuracy >= 60
                    ? 'var(--color-orange)'
                    : 'var(--color-danger)';

            return (
              <div
                key={student.id}
                className={`${styles.studentCard} ${isSelected ? styles.studentCardActive : ''}`}
                onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
              >
                <div className={styles.studentRow}>
                  <div className={styles.studentMain}>
                    <NameAvatar name={student.firstName} />
                    <div>
                      <div className={styles.studentName}>{fullName(student)}</div>
                      <div className={styles.studentSessions}>
                        {stats.totalSessions > 0
                          ? `${stats.totalSessions} ta mashq · ${stats.totalCorrect}/${stats.totalProblems} to'g'ri`
                          : "Hali mashq qilmadi"}
                      </div>
                    </div>
                  </div>

                  <div className={styles.studentStatsBadges}>
                    <span className={styles.accuracyBadge} style={{ background: accuracyColor }}>
                      {stats.totalSessions > 0 ? `${stats.accuracy}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Individual batafsil bo'limlar */}
                {isSelected && (
                  <div className={styles.detailDrawer}>
                    <div className={styles.studentSessions} style={{ marginBottom: 6 }}>
                      Formulalar bo'yicha ko'rsatkichlar:
                    </div>
                    <div className={styles.sectionGrid}>
                      {Object.entries(stats.bySection).map(([secId, secData]) => {
                        const meta = SECTION_META[secData.section];
                        const secColor = toneColor(meta.tone);
                        return (
                          <div key={secId} className={styles.sectionMiniCard}>
                            <div className={styles.sectionMiniHeader}>
                              <span style={{ color: secColor }}>{meta.label}</span>
                              <span>{secData.sessions > 0 ? `${secData.accuracy}%` : '—'}</span>
                            </div>
                            <div className={styles.sectionMiniMeta}>
                              {secData.sessions > 0
                                ? `${secData.correct}/${secData.total} to'g'ri (${secData.sessions} mashq)`
                                : "Ishlanmadi"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
