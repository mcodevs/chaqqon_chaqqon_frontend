import { useEffect, useMemo, useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { type CalendarDate, type Payment, type StudentAccess, accessOf } from '@/domain/billing';
import type { HomeworkStatus } from '@/domain/homework';
import { type StudentAccount, fullName } from '@/domain/users';
import { formatCalendarDate, formatLastActive } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useWrittenHomework } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { NameAvatar } from '@/shared/ui/NameAvatar';
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

export function StudentList({ students, payments, today, onCredentialsIssued }: StudentListProps) {
  const { students: studentService, billing, homework } = useServices();
  const recordPayment = useAsyncAction(billing.recordPayment);
  const cancelPayment = useAsyncAction(billing.cancelLatestPayment);
  const resetPassword = useAsyncAction(studentService.resetPassword);
  const removeStudent = useAsyncAction(studentService.remove);
  const homeworkList = useWrittenHomework();

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

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
      return true;
    });
  }, [students, selectedYear, selectedLevel]);

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
      </div>

      <ErrorMessage>
        {recordPayment.error ?? cancelPayment.error ?? resetPassword.error ?? removeStudent.error}
      </ErrorMessage>
      {filteredStudents.length === 0 && <EmptyState>O'quvchilar topilmadi.</EmptyState>}
      <ul className={styles.list}>
        {filteredStudents.map((student) => {
          const access = accessOf(payments, student.id, today);
          const paying = payingId === student.id;
          const editing = editingId === student.id;
          const lastActive = formatLastActive(student.lastActiveAt);
          const studentHw = homeworkList?.find((h) => h.studentId === student.id && h.date === today);

          return (
            <li key={student.id} className={styles.item}>
              <div className={styles.row}>
                <NameAvatar name={student.firstName} avatarUrl={student.avatarUrl} size={44} />
                <div className={styles.info}>
                  <div className={styles.name}>
                    {fullName(student)}
                    {student.birthYear && ` (${student.birthYear}-yil)`}
                    <span className={styles.badgeLevel} style={{ marginLeft: 6 }}>
                      {student.levelGroup ?? 'A'} toifa
                    </span>
                  </div>
                  <div className={styles.meta}>
                    login: <b>{student.username}</b> ·{' '}
                    <span className={styles.lastActiveText}>
                      {lastActive.isOnline && <span className={styles.onlineIndicator} />}
                      <span style={{ color: lastActive.isOnline ? '#059669' : '#64748b' }}>
                        {lastActive.text}
                      </span>
                    </span>
                  </div>
                  <div
                    className={`${styles.access} ${access.open ? styles.accessOpen : styles.accessClosed}`}
                  >
                    {accessLabel(access)}
                    {access.latest && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        disabled={cancelPayment.pending}
                        onClick={() => handleCancelPayment(student)}
                      >
                        bekor qilish
                      </button>
                    )}
                  </div>

                  {/* Yozma uy vazifasi statusini tezkor belgilash */}
                  <div className={styles.homeworkCheckSection}>
                    <span className={styles.homeworkLabel}>Yozma uy vazifasi:</span>
                    <div className={styles.hwButtonGroup}>
                      <button
                        type="button"
                        className={`${styles.hwBtn} ${studentHw?.status === 'bajardi' ? styles.hwBtnActiveBajardi : ''}`}
                        onClick={() => handleHomeworkStatus(student.id, 'bajardi')}
                      >
                        ✓ Bajardi
                      </button>
                      <button
                        type="button"
                        className={`${styles.hwBtn} ${studentHw?.status === 'chala' ? styles.hwBtnActiveChala : ''}`}
                        onClick={() => handleHomeworkStatus(student.id, 'chala')}
                      >
                        ⚠ Chala
                      </button>
                      <button
                        type="button"
                        className={`${styles.hwBtn} ${studentHw?.status === 'bajarmadi' ? styles.hwBtnActiveBajarmadi : ''}`}
                        onClick={() => handleHomeworkStatus(student.id, 'bajarmadi')}
                      >
                        ✕ Bajarmadi
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    size="sm"
                    variant="soft"
                    tone="blue"
                    onClick={() => {
                      setEditingId(editing ? null : student.id);
                      setPayingId(null);
                    }}
                  >
                    {editing ? 'Yopish' : 'Tahrirlash'}
                  </Button>
                  <Button
                    size="sm"
                    tone="green"
                    aria-expanded={paying}
                    onClick={() => {
                      setPayingId(paying ? null : student.id);
                      setEditingId(null);
                    }}
                  >
                    To'ladi
                  </Button>
                  <Button size="sm" variant="soft" tone="blue" onClick={() => handleReset(student)}>
                    Yangi parol
                  </Button>
                  <Button size="sm" variant="soft" tone="coral" onClick={() => handleRemove(student)}>
                    O'chirish
                  </Button>
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
