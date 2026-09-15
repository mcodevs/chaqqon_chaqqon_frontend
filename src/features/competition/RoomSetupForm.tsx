import { useState } from 'react';
import type { OpenRoomInput } from '@/application/competitionService';
import { MAX_ROOM_PARTICIPANTS } from '@/domain/competition';
import { DEFAULT_PRACTICE_CONFIG, type PracticeConfig } from '@/domain/practice/config';
import type { Student } from '@/domain/users';
import { PracticeConfigFields } from '@/features/practice/PracticeConfigFields';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Competition.module.css';
import { StudentPicker } from './StudentPicker';

interface RoomSetupFormProps {
  students: readonly Student[];
  /** Unpaid students, who cannot be picked. */
  closedIds: ReadonlySet<string>;
  /** Students in other active rooms. */
  busyIds?: ReadonlySet<string>;
  pending: boolean;
  error: string | null;
  onOpen: (input: OpenRoomInput) => void;
  onCancel?: () => void;
}

export function RoomSetupForm({
  students,
  closedIds,
  busyIds = new Set(),
  pending,
  error,
  onOpen,
  onCancel,
}: RoomSetupFormProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sameForAll, setSameForAll] = useState(true);
  const [sharedConfig, setSharedConfig] = useState(DEFAULT_PRACTICE_CONFIG);
  const [individualConfigs, setIndividualConfigs] = useState<Record<string, PracticeConfig>>({});

  const configFor = (id: string) => (sameForAll ? sharedConfig : (individualConfigs[id] ?? sharedConfig));

  const submit = () =>
    onOpen({
      participantIds: selectedIds,
      configs: Object.fromEntries(selectedIds.map((id) => [id, configFor(id)])),
    });

  return (
    <Card title="Yangi musobaqa xonasi">
      <StudentPicker
        students={students}
        closedIds={closedIds}
        busyIds={busyIds}
        selectedIds={selectedIds}
        max={MAX_ROOM_PARTICIPANTS}
        onChange={setSelectedIds}
      />

      <label className={styles.toggle}>
        <input type="checkbox" checked={sameForAll} onChange={(e) => setSameForAll(e.target.checked)} />
        Barchaga bir xil mavzu va sozlama
      </label>

      {sameForAll ? (
        <PracticeConfigFields value={sharedConfig} onChange={setSharedConfig} />
      ) : (
        selectedIds.map((id) => (
          <fieldset key={id} className={styles.individual}>
            <legend className={styles.individualName}>{students.find((s) => s.id === id)?.firstName}</legend>
            <PracticeConfigFields
              value={configFor(id)}
              onChange={(config) => setIndividualConfigs((current) => ({ ...current, [id]: config }))}
            />
          </fieldset>
        ))
      )}

      <ErrorMessage>{error}</ErrorMessage>
      <div className={onCancel ? styles.actions : undefined}>
        <Button tone="pink" block={!onCancel} disabled={selectedIds.length === 0 || pending} onClick={submit}>
          Xona ochish
        </Button>
        {onCancel && (
          <Button tone="coral" variant="outline" onClick={onCancel}>
            Bekor qilish
          </Button>
        )}
      </div>
    </Card>
  );
}
