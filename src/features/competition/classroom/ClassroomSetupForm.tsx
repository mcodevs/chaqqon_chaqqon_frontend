import { useState } from 'react';
import { CLASSROOM_PARTICIPANTS } from '@/domain/classroom';
import { DEFAULT_PRACTICE_CONFIG, type PracticeConfig } from '@/domain/practice/config';
import type { Student } from '@/domain/users';
import { PracticeConfigFields } from '@/features/practice/PracticeConfigFields';
import { useFullscreen } from '@/shared/hooks/useFullscreen';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { StudentPicker } from '../StudentPicker';
import styles from './Classroom.module.css';

interface ClassroomSetupFormProps {
  students: readonly Student[];
  /** Unpaid students, who cannot be picked. */
  closedIds: ReadonlySet<string>;
  onStart: (config: PracticeConfig, participants: readonly Student[]) => void;
}

export function ClassroomSetupForm({ students, closedIds, onStart }: ClassroomSetupFormProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [config, setConfig] = useState(DEFAULT_PRACTICE_CONFIG);
  const fullscreen = useFullscreen();
  const missing = CLASSROOM_PARTICIPANTS.min - selectedIds.length;

  const start = () => {
    // Requested inside the click: browsers only allow fullscreen during a user gesture.
    void fullscreen.enter();
    const participants = selectedIds
      .map((id) => students.find((student) => student.id === id))
      .filter((student): student is Student => student !== undefined);
    onStart(config, participants);
  };

  return (
    <Card>
      <p className={styles.intro}>
        Ekran tanlangan o'quvchilar soniga qarab bo'linadi. Har bir panelda o'z misoli bir vaqtda
        ko'rsatiladi: o'quvchilar javobni aytadi, siz uni panelga kiritasiz.
      </p>
      <StudentPicker
        students={students}
        closedIds={closedIds}
        selectedIds={selectedIds}
        max={CLASSROOM_PARTICIPANTS.max}
        onChange={setSelectedIds}
      />
      <PracticeConfigFields value={config} onChange={setConfig} />
      <Button size="lg" block disabled={missing > 0} onClick={start}>
        {missing > 0 ? `Yana kamida ${missing} ta o'quvchi tanlang` : 'Boshlash'}
      </Button>
    </Card>
  );
}
