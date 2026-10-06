import {
  type WorksheetBrand,
  type WorksheetConfig,
  type WorksheetLayout,
  WORKSHEET_LIMITS,
  normalizeWorksheetConfig,
} from '@/domain/practice/worksheet';
import { TopicField } from '@/features/practice/TopicField';
import { ChoiceField } from '@/shared/ui/ChoiceField';
import { numberChoices } from '@/shared/ui/choiceOptions';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { SliderField } from '@/shared/ui/SliderField';
import { TextField } from '@/shared/ui/TextField';
import styles from './Worksheet.module.css';

const LAYOUT_OPTIONS: { value: WorksheetLayout; label: string }[] = [
  { value: 'letters', label: 'Harfli (A–J)' },
  { value: 'numbers', label: 'Raqamli (1–10)' },
];

const LAYOUT_HINT: Record<WorksheetLayout, string> = {
  letters: "Ustunlar A dan J gacha, jadval ostida «VAQTI____» yo'li",
  numbers: 'Ustunlar 1 dan 10 gacha, chapda jadval raqami, pastki qatori «Javoblar»',
};

const DIGIT_CHOICES = numberChoices(WORKSHEET_LIMITS.digitCount, (n) => `${n} xonali`);
const COLUMN_CHOICES = numberChoices(WORKSHEET_LIMITS.columnCount);
const TABLE_CHOICES = numberChoices(WORKSHEET_LIMITS.tableCount);

interface WorksheetFormProps {
  config: WorksheetConfig;
  brand: WorksheetBrand;
  onConfigChange: (config: WorksheetConfig) => void;
  onBrandChange: (brand: WorksheetBrand) => void;
}

export function WorksheetForm({ config, brand, onConfigChange, onBrandChange }: WorksheetFormProps) {
  const set = <K extends keyof WorksheetConfig>(key: K, next: WorksheetConfig[K]) =>
    onConfigChange(normalizeWorksheetConfig({ ...config, [key]: next }));

  /** A topic owns its section and digit count, so picking either of those leaves the topic. */
  const leaveTopic = <K extends keyof WorksheetConfig>(key: K, next: WorksheetConfig[K]) =>
    onConfigChange(normalizeWorksheetConfig({ ...config, topicId: undefined, [key]: next }));

  return (
    <>
      <div className={styles.fieldBlock}>
        <span className={styles.fieldLabel}>Varaq ko‘rinishi</span>
        <SegmentedControl
          label="Varaq ko‘rinishi"
          options={LAYOUT_OPTIONS}
          value={config.layout}
          onChange={(layout) => set('layout', layout)}
        />
        <p className={styles.hint}>{LAYOUT_HINT[config.layout]}</p>
      </div>

      <TopicField
        section={config.section}
        topicId={config.topicId}
        digitCount={config.digitCount}
        onPickSection={(section) => leaveTopic('section', section)}
        onPickTopic={(topicId) => set('topicId', topicId)}
      />

      <ChoiceField
        label="Xonalar soni"
        options={DIGIT_CHOICES}
        value={config.digitCount}
        onChange={(n) => leaveTopic('digitCount', n)}
      />

      <SliderField
        label="Qator soni (bir misolda necha son)"
        {...WORKSHEET_LIMITS.rowCount}
        stepper
        value={config.rowCount}
        onChange={(n) => set('rowCount', n)}
      />

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={config.growRows}
          onChange={(event) => set('growRows', event.target.checked)}
        />
        Har bir keyingi jadvalda qator bittaga ko‘paysin
      </label>

      <ChoiceField
        label="Ustunlar soni (bir jadvalda necha misol)"
        options={COLUMN_CHOICES}
        value={config.columnCount}
        onChange={(n) => set('columnCount', n)}
      />

      <ChoiceField
        label="Bir varaqdagi jadvallar"
        options={TABLE_CHOICES}
        value={config.tableCount}
        onChange={(n) => set('tableCount', n)}
      />

      <SliderField
        label="Varaqlar soni"
        {...WORKSHEET_LIMITS.sheetCount}
        stepper
        value={config.sheetCount}
        onChange={(n) => set('sheetCount', n)}
      />

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={config.withAnswers}
          onChange={(event) => set('withAnswers', event.target.checked)}
        />
        Oxiriga javoblar kaliti qo‘shilsin (ustoz uchun)
      </label>

      <div className={styles.brandBlock}>
        <span className={styles.fieldLabel}>Varaq sarlavhasi</span>
        <TextField
          label="Markaz nomi"
          value={brand.title}
          maxLength={40}
          onChange={(event) => onBrandChange({ ...brand, title: event.target.value })}
        />
        <TextField
          label="O‘ng yuqorida (telegram, telefon)"
          value={brand.contact}
          maxLength={40}
          onChange={(event) => onBrandChange({ ...brand, contact: event.target.value })}
        />
        <TextField
          label="Pastda (ustoz ismi)"
          value={brand.footer}
          maxLength={60}
          placeholder="Masalan: NIZOMOVA DILNOZA"
          onChange={(event) => onBrandChange({ ...brand, footer: event.target.value })}
        />
      </div>
    </>
  );
}
