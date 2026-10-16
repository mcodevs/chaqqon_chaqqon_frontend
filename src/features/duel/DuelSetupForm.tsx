import { useState } from 'react';
import { DUEL_PARTICIPANTS, alignDuelConfigs } from '@/domain/duel';
import { DEFAULT_PRACTICE_CONFIG, type PracticeConfig } from '@/domain/practice/config';
import type { Student } from '@/domain/users';
import { StudentPicker } from '@/features/competition/StudentPicker';
import { PracticeConfigFields } from '@/features/practice/PracticeConfigFields';
import { RECORDED_KINDS } from '@/features/practice/sections';
import { useDrillKinds } from '@/features/practice/useDrillKinds';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import styles from './Duel.module.css';

export interface DuelSetup {
  guestIds: string[];
  configs: Record<string, PracticeConfig>;
  sameConfig: boolean;
}

interface DuelSetupFormProps {
  /** The host's classmates; they are picked from here. */
  classmates: readonly Student[];
  me: Student;
  pending: boolean;
  error: string | null;
  onOpen: (setup: DuelSetup) => void;
}

const SETTING_MODES: readonly SegmentOption<'same' | 'each'>[] = [
  { value: 'same', label: 'Hammaga bir xil' },
  { value: 'each', label: 'Har kimga alohida' },
];

/**
 * The host builds the duel: classmates, then the settings. One shared setting means everyone gets
 * the very same numbers, so it is a straight race; set one by one, each child gets a draw of their
 * own at their own level. Either way the drill and the number of problems are shared, because the
 * rounds move on together.
 */
/**
 * Nobody is greyed out here: a child sees their classmates' names but never their payments, so the
 * app cannot tell which of them is still open. The one who picked finds out from the answer.
 */
const NOBODY: ReadonlySet<string> = new Set();

export function DuelSetupForm({ classmates, me, pending, error, onOpen }: DuelSetupFormProps) {
  const drillKinds = useDrillKinds(RECORDED_KINDS);
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'same' | 'each'>('same');
  const [configs, setConfigs] = useState<Record<string, PracticeConfig>>({
    [me.id]: DEFAULT_PRACTICE_CONFIG,
  });
  const [tab, setTab] = useState(me.id);

  const hostConfig = configs[me.id] ?? DEFAULT_PRACTICE_CONFIG;
  const configOf = (id: string) => configs[id] ?? hostConfig;

  /** The host's drill and problem count belong to everyone, so changing them realigns the rest. */
  const setHostConfig = (next: PracticeConfig) =>
    setConfigs((current) => ({ ...alignDuelConfigs(current, next), [me.id]: next }));

  const setGuestConfig = (id: string, next: PracticeConfig) =>
    setConfigs((current) => ({ ...current, ...alignDuelConfigs({ [id]: next }, hostConfig) }));

  const missing = DUEL_PARTICIPANTS.min - 1 - guestIds.length;
  const tabs: SegmentOption<string>[] = [
    { value: me.id, label: 'Men' },
    ...guestIds.map((id) => ({
      value: id,
      label: classmates.find((student) => student.id === id)?.firstName ?? "O'quvchi",
    })),
  ];
  const tabId = tabs.some((option) => option.value === tab) ? tab : me.id;

  const open = () =>
    onOpen({
      guestIds,
      configs:
        mode === 'same'
          ? Object.fromEntries([me.id, ...guestIds].map((id) => [id, hostConfig]))
          : Object.fromEntries([me.id, ...guestIds].map((id) => [id, configOf(id)])),
      sameConfig: mode === 'same',
    });

  return (
    <Card title="Bellashuv">
      <p className={styles.intro}>
        Sinfdoshlaringizni chaqirib, o'zingiz bellashuv o'tkazing. Misollar hammaning telefonida bir vaqtda
        chaqnaydi, keyingisiga esa siz o'tkazasiz. Bu bellashuv uchun yulduzcha berilmaydi va reytingga
        qo'shilmaydi.
      </p>

      <StudentPicker
        students={classmates}
        closedIds={NOBODY}
        selectedIds={guestIds}
        max={DUEL_PARTICIPANTS.max - 1}
        onChange={setGuestIds}
      />

      <div className={styles.modeField}>
        <span className={styles.fieldLabel}>Sozlamalar</span>
        <SegmentedControl label="Sozlamalar" options={SETTING_MODES} value={mode} onChange={setMode} />
        <p className={styles.hint}>
          {mode === 'same'
            ? 'Hamma bir xil sozlama bilan, bir xil misollarni yechadi — adolatli poyga.'
            : "Har kimga o'z darajasi: misollar ham har xil bo'ladi, shuning uchun o'rinlar faqat to'g'ri javob soniga qarab beriladi."}
        </p>
      </div>

      {mode === 'each' && guestIds.length > 0 && (
        <div className={styles.tabField}>
          <SegmentedControl
            label="Kimning sozlamasi"
            appearance="pill"
            options={tabs}
            value={tabId}
            onChange={setTab}
          />
        </div>
      )}

      {tabId === me.id || mode === 'same' ? (
        <PracticeConfigFields value={hostConfig} onChange={setHostConfig} kinds={drillKinds} />
      ) : (
        /* The drill and the problem count come from the host's own form above. */
        <PracticeConfigFields
          key={tabId}
          value={configOf(tabId)}
          onChange={(next) => setGuestConfig(tabId, next)}
          kinds={[hostConfig.kind]}
          hideProblemCount
        />
      )}

      <ErrorMessage>{error}</ErrorMessage>
      <Button size="lg" block disabled={missing > 0 || pending} onClick={open}>
        {missing > 0
          ? `Yana kamida ${missing} ta sinfdosh tanlang`
          : pending
            ? 'Yaratilmoqda…'
            : 'Bellashuv yaratish'}
      </Button>
    </Card>
  );
}
