import { useMemo, useState } from 'react';
import { type TimeRange, computeClassroomStats } from '@/domain/statistics';
import { fullName } from '@/domain/users';
import { SECTION_META } from '@/features/practice/sections';
import { useResults, useSchoolToday, useStudents } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { EmptyState } from '@/shared/ui/Notice';
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

  if (!classroom)
    return (
      <Card title="O'quvchilar bo'yicha statistika">
        <SkeletonList rows={5} />
      </Card>
    );

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
          <div className={`${styles.kpiValue} ${styles.kpiValueLead}`}>
            {classroom.totalSessions > 0 ? `${classroom.accuracy}%` : '—'}
          </div>
          <div className={styles.kpiLabel}>Sinf aniqligi</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>
            {classroom.activeStudentsCount} / {classroom.students.length}
          </div>
          <div className={styles.kpiLabel}>Faol o'quvchilar</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{classroom.totalSessions} ta</div>
          <div className={styles.kpiLabel}>Jami mashqlar</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>
            {classroom.totalCorrect} / {classroom.totalProblems}
          </div>
          <div className={styles.kpiLabel}>To'g'ri misollar</div>
        </div>
      </div>

      {/* 3. O'quvchilar kesimida tahlil */}
      <Card title="O'quvchilar bo'yicha statistika">
        {classroom.students.length === 0 && (
          <EmptyState icon="📈" title="Statistika hali yig'ilmagan">
            O'quvchilar mashq qila boshlagach, ko'rsatkichlar shu yerda chiqadi.
          </EmptyState>
        )}
        <div className={styles.studentList}>
          {classroom.students.map(({ student, stats }) => {
            const isSelected = selectedStudentId === student.id;
            const accuracyClass =
              stats.totalSessions === 0
                ? styles.accuracyNeutral
                : stats.accuracy >= 80
                  ? styles.accuracyGood
                  : stats.accuracy >= 60
                    ? styles.accuracyMid
                    : styles.accuracyLow;

            return (
              <div
                key={student.id}
                className={`${styles.studentCard} ${isSelected ? styles.studentCardActive : ''}`}
                onClick={() => setSelectedStudentId(isSelected ? null : student.id)}
              >
                <div className={styles.studentRow}>
                  <div className={styles.studentMain}>
                    <NameAvatar name={student.firstName} avatarUrl={student.avatarUrl} />
                    <div>
                      <div className={styles.studentName}>{fullName(student)}</div>
                      <div className={styles.studentSessions}>
                        {stats.totalSessions > 0
                          ? `${stats.totalSessions} ta mashq · ${stats.totalCorrect}/${stats.totalProblems} to'g'ri`
                          : 'Hali mashq qilmadi'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.studentStatsBadges}>
                    <span className={`${styles.accuracyBadge} ${accuracyClass}`}>
                      {stats.totalSessions > 0 ? `${stats.accuracy}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Individual batafsil bo'limlar */}
                {isSelected && (
                  <div className={styles.detailDrawer}>
                    <div className={styles.detailTitle}>Formulalar bo'yicha ko'rsatkichlar:</div>
                    <div className={styles.sectionGrid}>
                      {Object.entries(stats.bySection).map(([secId, secData]) => {
                        const meta = SECTION_META[secData.section];

                        return (
                          <div key={secId} className={styles.sectionMiniCard}>
                            <div className={styles.sectionMiniHeader}>
                              <span>{meta.label}</span>
                              <span>{secData.sessions > 0 ? `${secData.accuracy}%` : '—'}</span>
                            </div>
                            <div className={styles.sectionMiniMeta}>
                              {secData.sessions > 0
                                ? `${secData.correct}/${secData.total} to'g'ri (${secData.sessions} mashq)`
                                : 'Ishlanmadi'}
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
