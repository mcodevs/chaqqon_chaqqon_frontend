import { useEffect, useMemo, useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { type CalendarDate, type Payment, type StudentAccess, accessOf } from '@/domain/billing';
import type { HomeworkStatus } from '@/domain/homework';
import type { StreakInfo } from '@/domain/streak';
import { type StudentAccount, ageFromBirthYear, fullName } from '@/domain/users';
import { formatCalendarDate, formatLastActive } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useStarsByStudent, useStreaksByStudent, useWrittenHomework } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { MenuButton } from '@/shared/ui/MenuButton';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { StarsBadge } from '@/shared/ui/StarsBadge';
import { StreakBadge } from '@/shared/ui/StreakBadge';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import { EditStudentForm } from './EditStudentForm';
import { PaymentForm } from './PaymentForm';
import styles from './Teacher.module.css';

interface StudentListProps {
  students: readonly StudentAccount[];
  payments: readonly Payment[];
  today: CalendarDate;
  onCredentialsIssued: (credentials: StudentCredentials) => void;
}

function accessLabel({ open, paidUntil }: StudentAccess): string {
  if (!paidUntil) return "Yopiq · to'lov belgilanmagan";
  return open
    ? `${formatCalendarDate(paidUntil)} gacha ochiq`
    : `Yopiq · ${formatCalendarDate(paidUntil)} kuni tugagan`;
}

/** A student with no results at all is simply missing from the streak map. */
const EMPTY_STREAK: StreakInfo = { current: 0, longest: 0, activeToday: false, lastActiveDate: null };

const HOMEWORK_OPTIONS = [
  { status: 'bajardi' as HomeworkStatus, label: 'Bajardi', icon: '✓', activeClass: 'hwDone' },
  { status: 'chala' as HomeworkStatus, label: 'Chala', icon: '~', activeClass: 'hwPartial' },
  { status: 'bajarmadi' as HomeworkStatus, label: 'Bajarmadi', icon: '✕', activeClass: 'hwMissed' },
];

export function StudentList({ students, payments, today, onCredentialsIssued }: StudentListProps) {
  const { students: studentService, billing, homework } = useServices();
  const recordPayment = useAsyncAction(billing.recordPayment);
  const cancelPayment = useAsyncAction(billing.cancelLatestPayment);
  const resetPassword = useAsyncAction(studentService.resetPassword);
  const removeStudent = useAsyncAction(studentService.remove);
  const homeworkList = useWrittenHomework();
  const currentYear = Number(today.slice(0, 4));
  const streaks = useStreaksByStudent();
  const stars = useStarsByStudent();

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [onlyIdle, setOnlyIdle] = useState(false);

  // Re-evaluate relative last-active times every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  /** Whose "To'ladi" form is open. */
  const [payingId, setPayingId] = useState<string | null>(null);
  /** Whose "Tahrirlash" form is open. */
  const [editingId, setEditingId] = useState<string | null>(null);

  // Extract unique birth years from student list
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const s of students) {
      if (s.birthYear) years.add(s.birthYear);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [students]);

  // Filter students based on birth year and level group
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedYear !== 'all' && String(s.birthYear) !== selectedYear) return false;
      if (selectedLevel !== 'all' && (s.levelGroup ?? 'A') !== selectedLevel) return false;
      if (onlyIdle && (streaks?.get(s.id)?.current ?? 0) > 0) return false;
      return true;
    });
  }, [students, selectedYear, selectedLevel, onlyIdle, streaks]);

  const handlePayment = async (student: StudentAccount, paidUntil: CalendarDate) => {
    if (await recordPayment.run(student.id, paidUntil)) setPayingId(null);
  };

  const handleCancelPayment = (student: StudentAccount) => {
    if (window.confirm(`${student.firstName} uchun oxirgi to'lov bekor qilinsinmi?`)) {
      void cancelPayment.run(student.id);
    }
  };

  const handleReset = async (student: StudentAccount) => {
    if (!window.confirm(`${student.firstName} uchun yangi parol yaratilsinmi?`)) return;
    const credentials = await resetPassword.run(student.id);
    if (credentials) onCredentialsIssued(credentials);
  };

  const handleRemove = (student: StudentAccount) => {
    if (window.confirm(`${fullName(student)} o'chirilsinmi?`)) void removeStudent.run(student.id);
  };

  const handleHomeworkStatus = async (studentId: string, status: HomeworkStatus) => {
    await homework.setStatus(studentId, today, status);
  };

  return (
    <Card title={`O'quvchilar ro'yxati (${filteredStudents.length}/${students.length})`}>
      {/* Guruhlash filtrlari */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Yil:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Barchasi</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}-yil
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Toifa:</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Barchasi</option>
            <option value="A">A toifa (Formulasiz)</option>
            <option value="B">B toifa (Kichik do'st)</option>
            <option value="C">C toifa (Katta do'st)</option>
            <option value="D">D toifa (Miks)</option>
          </select>
        </div>

        <label className={styles.filterToggle}>
          <input type="checkbox" checked={onlyIdle} onChange={(e) => setOnlyIdle(e.target.checked)} />
          Faqat mashq qilmayotganlar
        </label>
      </div>

      <ErrorMessage>
        {recordPayment.error ?? cancelPayment.error ?? resetPassword.error ?? removeStudent.error}
      </ErrorMessage>
      {filteredStudents.length === 0 && (
        <EmptyState icon="🔍" title="O'quvchi topilmadi">
          {students.length === 0
            ? "Hali o'quvchi qo'shilmagan. Yuqoridagi tugma orqali birinchisini qo'shing."
            : 'Tanlangan filtrga mos o‘quvchi yo‘q — filtrni kengaytiring.'}
        </EmptyState>
      )}
      <ul className={styles.list}>
        {filteredStudents.map((student) => {
          const access = accessOf(payments, student.id, today);
          const paying = payingId === student.id;
          const editing = editingId === student.id;
          const lastActive = formatLastActive(student.lastActiveAt);
          const studentHw = homeworkList?.find((h) => h.studentId === student.id && h.date === today);
          const studentAge = ageFromBirthYear(student.birthYear, currentYear);

          return (
            <li key={student.id} className={styles.item}>
              <div className={styles.card}>
                {/* Kim — avatar, ism va login; o'ngda esa amallar. */}
                <div className={styles.identityRow}>
                  <NameAvatar name={student.firstName} avatarUrl={student.avatarUrl} size={48} zoomable />

                  <div className={styles.identity}>
                    <span className={styles.nameText}>{fullName(student)}</span>
                    <div className={styles.meta}>
                      {studentAge !== null && <span>{studentAge} yosh</span>}
                      <span>
                        login: <b>{student.username}</b>
                      </span>
                      <span className={lastActive.isOnline ? styles.metaOnline : undefined}>
                        {lastActive.isOnline && <span className={styles.onlineIndicator} />}
                        {lastActive.text}
                      </span>
                    </div>
                  </div>

                  <div className={styles.rowActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      tone="success"
                      aria-expanded={paying}
                      onClick={() => {
                        setPayingId(paying ? null : student.id);
                        setEditingId(null);
                      }}
                    >
                      To'ladi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-expanded={editing}
                      onClick={() => {
                        setEditingId(editing ? null : student.id);
                        setPayingId(null);
                      }}
                    >
                      {editing ? 'Yopish' : 'Tahrirlash'}
                    </Button>
                    <MenuButton
                      label={`${student.firstName} uchun boshqa amallar`}
                      actions={[
                        ...(access.latest
                          ? [
                              {
                                label: "To'lovni bekor qilish",
                                icon: '↩',
                                onSelect: () => handleCancelPayment(student),
                              },
                            ]
                          : []),
                        {
                          label: 'Yangi parol',
                          icon: '🔑',
                          onSelect: () => void handleReset(student),
                        },
                        {
                          label: "O'chirish",
                          icon: '🗑',
                          danger: true,
                          onSelect: () => handleRemove(student),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Holat — bir xil ko'rinishdagi belgilar qatori, yonida bugungi uy vazifasi. */}
                <div className={styles.statusRow}>
                  <div className={styles.chips}>
                    <span className={styles.badgeLevel}>{student.levelGroup ?? 'A'} toifa</span>
                    {streaks && (
                      <StreakBadge streak={streaks.get(student.id) ?? EMPTY_STREAK} today={today} />
                    )}
                    {stars && <StarsBadge balance={stars.get(student.id)} />}
                    <span
                      className={`${styles.access} ${access.open ? styles.accessOpen : styles.accessClosed}`}
                    >
                      {accessLabel(access)}
                    </span>
                  </div>

                  <div className={styles.homework} role="group" aria-label="Yozma uy vazifasi">
                    {HOMEWORK_OPTIONS.map((option) => {
                      const active = studentHw?.status === option.status;
                      return (
                        <button
                          key={option.status}
                          type="button"
                          aria-pressed={active}
                          title={`Yozma uy vazifasi: ${option.label}`}
                          className={`${styles.hwBtn} ${active ? styles[option.activeClass] : ''}`}
                          onClick={() => handleHomeworkStatus(student.id, option.status)}
                        >
                          <span aria-hidden="true">{option.icon}</span>
                          <span className={styles.hwLabel}>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {paying && (
                <PaymentForm
                  firstName={student.firstName}
                  access={access}
                  today={today}
                  pending={recordPayment.pending}
                  onSave={(paidUntil) => void handlePayment(student, paidUntil)}
                  onCancel={() => setPayingId(null)}
                />
              )}
              {editing && (
                <EditStudentForm
                  student={student}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
