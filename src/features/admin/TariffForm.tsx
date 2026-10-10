import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import type { TariffInput } from '@/application/ports';
import { FEATURES, FEATURE_META, type Feature, type Tariff } from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import styles from './Tariffs.module.css';

/** Sections the students see too, then the ones only the teacher works with. */
const SHARED_FEATURES = FEATURES.filter((feature) => FEATURE_META[feature].student !== null);
const TEACHER_FEATURES = FEATURES.filter((feature) => FEATURE_META[feature].student === null);

const LIMIT_OPTIONS = [
  { value: 'limited', label: 'Cheklangan' },
  { value: 'unlimited', label: 'Cheklanmagan' },
] as const;

/** Whole numbers typed by hand; an empty or broken field is NaN, so saving rejects it. */
const wholeNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));

function priceHint(text: string, price: number): string {
  if (text.trim() === '') return 'Har oy ustoz balansidan yechiladi';
  if (!Number.isInteger(price) || price < 0) return 'Butun son kiriting, masalan 150000';
  if (price === 0) return 'Bepul tarif: balansdan hech narsa yechilmaydi';
  return `Har oy ustoz balansidan ${formatSom(price)} yechiladi`;
}

/** Creates a tariff, or edits one: what it costs, how many students it takes and what it opens. */
export function TariffForm({ tariff, onDone }: { tariff: Tariff | null; onDone: () => void }) {
  const { admin } = useServices();
  // The action returns nothing, so success is spelled out for the form to see.
  const save = useAsyncAction(async (...args: Parameters<typeof admin.saveTariff>) => {
    await admin.saveTariff(...args);
    return true;
  });

  const [name, setName] = useState(tariff?.name ?? '');
  const [description, setDescription] = useState(tariff?.description ?? '');
  // Numbers stay text while typed, so a field can be cleared without snapping back to 0.
  const [price, setPrice] = useState(tariff ? String(tariff.monthlyPrice) : '');
  const [limited, setLimited] = useState(tariff ? tariff.maxStudents !== null : true);
  const [maxStudents, setMaxStudents] = useState(String(tariff?.maxStudents ?? 30));
  const [features, setFeatures] = useState<Feature[]>(tariff?.features ?? []);
  const [isPublic, setIsPublic] = useState(tariff?.isPublic ?? true);
  const [sortOrder, setSortOrder] = useState(String(tariff?.sortOrder ?? 0));
  const [archived, setArchived] = useState(tariff ? tariff.archivedAt !== null : false);

  const monthlyPrice = wholeNumber(price);

  // The form opens above the list, often far from the card that was tapped: bring it into view.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const toggle = (feature: Feature, on: boolean) =>
    setFeatures((current) => FEATURES.filter((f) => (f === feature ? on : current.includes(f))));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input: TariffInput = {
      name,
      description,
      monthlyPrice,
      maxStudents: limited ? wholeNumber(maxStudents) : null,
      features,
      isPublic,
      sortOrder: Math.round(Number(sortOrder) || 0),
      archived,
    };
    const done = await save.run(tariff?.id ?? null, input);
    if (done !== undefined) onDone();
  };

  return (
    <div ref={top} className={styles.formAnchor}>
      <Card title={tariff ? `«${tariff.name}» tarifini tahrirlash` : 'Yangi tarif'}>
        <form className={styles.form} onSubmit={submit} noValidate>
          <FormSection title="Asosiy ma'lumot">
            <div className={styles.fieldPair}>
              <TextField
                label="Tarif nomi"
                placeholder="Masalan: Standart"
                maxLength={60}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="Oylik narx, so'm"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="150000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                hint={priceHint(price, monthlyPrice)}
              />
            </div>
            <TextField
              label="Qisqa tavsif (ixtiyoriy)"
              placeholder="Masalan: Kichik guruh bilan ishlaydigan ustozlar uchun"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              hint="Landing sahifada tarif nomi ostida chiqadi"
            />
          </FormSection>

          <FormSection title="O'quvchilar soni" description="Ustoz bu tarifda nechta o'quvchi qo'sha oladi.">
            <div className={styles.limitRow}>
              <SegmentedControl
                label="O'quvchilar soni"
                appearance="pill"
                options={LIMIT_OPTIONS}
                value={limited ? 'limited' : 'unlimited'}
                onChange={(value) => setLimited(value === 'limited')}
              />
              {limited && (
                <TextField
                  label="Eng ko'p o'quvchi"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                />
              )}
            </div>
          </FormSection>

          <FormSection
            title="Ochiladigan bo'limlar"
            description="O'quvchilar ro'yxati, ularning to'lovlari, mashq, abakus va natijalar har qanday tarifda ochiq. Bu yerda faqat qo'shimcha bo'limlar tanlanadi."
            aside={
              <div className={styles.sectionTools}>
                <span className={styles.counter}>
                  {features.length} / {FEATURES.length} tanlandi
                </span>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setFeatures([...FEATURES])}
                >
                  Hammasi
                </button>
                <button type="button" className={styles.textButton} onClick={() => setFeatures([])}>
                  Tozalash
                </button>
              </div>
            }
          >
            <FeatureGroup
              title="Ustozga ham, o'quvchiga ham"
              features={SHARED_FEATURES}
              selected={features}
              onToggle={toggle}
            />
            <FeatureGroup
              title="Faqat ustozga"
              features={TEACHER_FEATURES}
              selected={features}
              onToggle={toggle}
            />
          </FormSection>

          <FormSection title="Ko'rinish">
            <OptionRow
              checked={isPublic}
              onChange={setIsPublic}
              title="Landing sahifada ko'rsatilsin"
              description="Mehmonlar tarifni ko'radi va aynan shu tarifga ariza qoldira oladi."
            />
            {tariff && (
              <OptionRow
                checked={archived}
                onChange={setArchived}
                title="Arxivlash"
                description="Yangi ustozlarga taklif qilinmaydi. Hozir shu tarifdagi ustozlarda o'zgarishsiz qoladi."
              />
            )}
            <div className={styles.narrowField}>
              <TextField
                label="Tartib raqami"
                type="number"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                hint="Kichik raqamli tarif ro'yxatda oldinroq turadi"
              />
            </div>
          </FormSection>

          <ErrorMessage>{save.error}</ErrorMessage>
          <div className={styles.formActions}>
            <Button type="submit" disabled={save.pending}>
              {tariff ? 'Saqlash' : 'Tarifni yaratish'}
            </Button>
            <Button variant="outline" onClick={onDone}>
              Bekor qilish
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function FormSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionIntro}>
          <h4 id={titleId} className={styles.sectionTitle}>
            {title}
          </h4>
          {description && <p className={styles.sectionText}>{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FeatureGroup({
  title,
  features,
  selected,
  onToggle,
}: {
  title: string;
  features: readonly Feature[];
  selected: readonly Feature[];
  onToggle: (feature: Feature, on: boolean) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>{title}</legend>
      <div className={styles.options}>
        {features.map((feature) => {
          const meta = FEATURE_META[feature];
          return (
            <OptionRow
              key={feature}
              icon={meta.icon}
              checked={selected.includes(feature)}
              onChange={(on) => onToggle(feature, on)}
              title={meta.label}
              description={<FeatureAudience teacher={meta.teacher} student={meta.student} />}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

/** Who gets what: one line when it is the teacher alone or both get the same, two when they differ. */
function FeatureAudience({ teacher, student }: { teacher: string | null; student: string | null }) {
  if (!student || !teacher || teacher === student) return <>{teacher ?? student}</>;
  return (
    <span className={styles.audience}>
      <span className={styles.audienceRole}>Ustoz</span>
      <span>{teacher}</span>
      <span className={styles.audienceRole}>O'quvchi</span>
      <span>{student}</span>
    </span>
  );
}

/** A checkbox as a whole tappable row: a title that says what it is and a line that says what it does. */
function OptionRow({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: ReactNode;
  icon?: string;
}) {
  return (
    <label className={styles.option} data-checked={checked}>
      <input
        type="checkbox"
        className={styles.optionInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.optionBox} aria-hidden="true">
        ✓
      </span>
      <span className={styles.optionBody}>
        <span className={styles.optionTitle}>
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </span>
        <span className={styles.optionText}>{description}</span>
      </span>
    </label>
  );
}
