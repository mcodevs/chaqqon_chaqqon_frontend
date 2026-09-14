import type { Student } from '@/domain/users';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './Competition.module.css';

interface StudentPickerProps {
  students: readonly Student[];
  /** Unpaid students: listed, but they cannot take part. */
  closedIds: ReadonlySet<string>;
  /** In the order they were picked. */
  selectedIds: readonly string[];
  max: number;
  onChange: (ids: string[]) => void;
}

export function StudentPicker({ students, closedIds, selectedIds, max, onChange }: StudentPickerProps) {
  const isFull = selectedIds.length >= max;

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <>
      {students.length === 0 && <EmptyState>Avval o'quvchi qo'shing.</EmptyState>}
      <div className={styles.picker} role="group" aria-label="Ishtirokchilar">
        {students.map((student) => {
          const selected = selectedIds.includes(student.id);
          const closed = closedIds.has(student.id);
          return (
            <button
              key={student.id}
              type="button"
              aria-pressed={selected}
              disabled={!selected && (closed || isFull)}
              className={styles.pickChip}
              onClick={() => toggle(student.id)}
            >
              {student.firstName}
              {closed && <span className={styles.closedMark}> · yopiq</span>}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>
        {selectedIds.length}/{max} o'quvchi tanlandi
      </p>
    </>
  );
}
