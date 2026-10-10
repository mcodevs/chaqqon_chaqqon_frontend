import { useState } from 'react';
import type { Student } from '@/domain/users';
import { EmptyState } from '@/shared/ui/Notice';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import styles from './Competition.module.css';

type LevelFilter = 'all' | 'A' | 'B' | 'C' | 'D';
const LEVELS = ['A', 'B', 'C', 'D'] as const;

interface StudentPickerProps {
  students: readonly Student[];
  /** Unpaid students: listed, but they cannot take part. */
  closedIds: ReadonlySet<string>;
  /** Students who are already participating in another active room. */
  busyIds?: ReadonlySet<string>;
  /** In the order they were picked. */
  selectedIds: readonly string[];
  max: number;
  onChange: (ids: string[]) => void;
}

export function StudentPicker({
  students,
  closedIds,
  busyIds = new Set(),
  selectedIds,
  max,
  onChange,
}: StudentPickerProps) {
  const isFull = selectedIds.length >= max;
  // A long class is narrowed by level; students already picked stay picked while hidden.
  const [level, setLevel] = useState<LevelFilter>('all');
  const levelOf = (student: Student) => student.levelGroup ?? 'A';
  const levelOptions: SegmentOption<LevelFilter>[] = [
    { value: 'all', label: `Hammasi (${students.length})` },
    ...LEVELS.filter((l) => students.some((s) => levelOf(s) === l)).map((l) => ({
      value: l,
      label: `${l} toifa (${students.filter((s) => levelOf(s) === l).length})`,
    })),
  ];
  const shown = level === 'all' ? students : students.filter((s) => levelOf(s) === level);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <>
      {students.length === 0 && (
        <EmptyState icon="👥" title="O'quvchi yo'q">
          Musobaqa uchun avval "O'quvchilar" bo'limidan o'quvchi qo'shing.
        </EmptyState>
      )}
      {levelOptions.length > 2 && (
        <div className={styles.levelFilter}>
          <SegmentedControl
            label="Toifa"
            appearance="pill"
            options={levelOptions}
            value={level}
            onChange={setLevel}
          />
        </div>
      )}
      <div className={styles.picker} role="group" aria-label="Ishtirokchilar">
        {shown.map((student) => {
          const selected = selectedIds.includes(student.id);
          const closed = closedIds.has(student.id);
          const busy = busyIds.has(student.id);
          return (
            <button
              key={student.id}
              type="button"
              aria-pressed={selected}
              disabled={!selected && (closed || busy || isFull)}
              className={styles.pickChip}
              onClick={() => toggle(student.id)}
            >
              {student.firstName}
              {closed && <span className={styles.closedMark}> · yopiq</span>}
              {busy && !closed && <span className={styles.closedMark}> · band</span>}
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
