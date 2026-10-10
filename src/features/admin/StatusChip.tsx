import type { TeacherStatus } from '@/domain/teacherBilling';
import { STATUS_LABEL, STATUS_TONE } from '@/features/teacher/subscription/subscriptionText';
import styles from './Admin.module.css';

const ICON: Record<TeacherStatus, string> = {
  unbilled: '○',
  ok: '✓',
  due_soon: '⏳',
  overdue: '!',
  blocked: '🔒',
  disabled: '⏸',
};

/** A status never rests on color alone: it carries an icon and its name. */
export function StatusChip({ status }: { status: TeacherStatus }) {
  return (
    <span className={`${styles.chip} ${styles[`chip_${STATUS_TONE[status]}`]}`}>
      <span aria-hidden="true">{ICON[status]}</span> {STATUS_LABEL[status]}
    </span>
  );
}
