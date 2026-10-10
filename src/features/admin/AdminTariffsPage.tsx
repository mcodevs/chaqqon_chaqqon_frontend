import { type FormEvent, useState } from 'react';
import type { TariffInput } from '@/application/ports';
import { FEATURES, FEATURE_META, type Feature, type Tariff } from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { useAdminTariffs } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Admin.module.css';

const EMPTY: TariffInput = {
  name: '',
  monthlyPrice: 0,
  maxStudents: 30,
  features: [],
  description: '',
  isPublic: true,
  sortOrder: 0,
  archived: false,
};

/** Tariffs: price, student limit and the sections they open. Shown on the landing page when public. */
export function AdminTariffsPage() {
  const tariffs = useAdminTariffs();
  const [editing, setEditing] = useState<Tariff | 'new' | null>(null);

  if (!tariffs) {
    return (
      <Card>
        <SkeletonList rows={4} avatar={false} />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      {editing ? (
        <TariffForm
          key={editing === 'new' ? 'new' : editing.id}
          tariff={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className={styles.toolbar}>
          <p className={styles.hint}>Narx o'zgarsa, ustozlarga keyingi oylik yechimdan qo'llanadi.</p>
          <Button onClick={() => setEditing('new')}>+ Yangi tarif</Button>
        </div>
      )}

      {tariffs.length === 0 ? (
        <EmptyState icon="🏷️" title="Hali tarif yo'q" />
      ) : (
        <div className={styles.tariffGrid}>
          {tariffs.map((tariff) => (
            <article
              key={tariff.id}
              className={`${styles.tariffCard} ${tariff.archivedAt ? styles.tariffArchived : ''}`}
            >
              <div className={styles.headerRow}>
                <h3 className={styles.tariffName}>{tariff.name}</h3>
                <span className={styles.badge}>
                  {tariff.archivedAt ? 'Arxivda' : tariff.isPublic ? "Landing'da" : 'Yashirin'}
                </span>
              </div>
              <span className={styles.tariffPrice}>
                {formatSom(tariff.monthlyPrice)}
                <span className={styles.muted}> / oy</span>
              </span>
              <span className={styles.muted}>
                {tariff.maxStudents
                  ? `${tariff.maxStudents} tagacha o'quvchi`
                  : "O'quvchilar soni cheklanmagan"}
              </span>
              {tariff.description && <p className={styles.hint}>{tariff.description}</p>}
              <ul className={styles.tagList}>
                {tariff.features.map((feature) => (
                  <li key={feature} className={styles.badge}>
                    {FEATURE_META[feature].label}
                  </li>
                ))}
              </ul>
              <div>
                <Button size="sm" variant="outline" onClick={() => setEditing(tariff)}>
                  Tahrirlash
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TariffForm({ tariff, onDone }: { tariff: Tariff | null; onDone: () => void }) {
  const { admin } = useServices();
  // The action returns nothing, so success is spelled out for the form to see.
  const save = useAsyncAction(async (...args: Parameters<typeof admin.saveTariff>) => {
    await admin.saveTariff(...args);
    return true;
  });
  const [form, setForm] = useState<TariffInput>(
    tariff ? { ...tariff, archived: tariff.archivedAt !== null } : EMPTY,
  );
  const [limited, setLimited] = useState(tariff ? tariff.maxStudents !== null : true);
  const set = <K extends keyof TariffInput>(key: K, value: TariffInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = (feature: Feature) =>
    set(
      'features',
      form.features.includes(feature)
        ? form.features.filter((f) => f !== feature)
        : FEATURES.filter((f) => f === feature || form.features.includes(f)),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const done = await save.run(tariff?.id ?? null, {
      ...form,
      maxStudents: limited ? form.maxStudents : null,
    });
    if (done !== undefined) onDone();
  };

  return (
    <Card title={tariff ? `${tariff.name} — tahrirlash` : 'Yangi tarif'}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField label="Nomi *" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <TextField
            label="Oylik narx (so'm)"
            type="number"
            inputMode="numeric"
            min={0}
            value={String(form.monthlyPrice)}
            onChange={(e) => set('monthlyPrice', Math.round(Number(e.target.value) || 0))}
          />
          <div>
            <label className={styles.check}>
              <input type="checkbox" checked={limited} onChange={(e) => setLimited(e.target.checked)} />
              O'quvchilar soni cheklangan
            </label>
            {limited && (
              <TextField
                label="Eng ko'p o'quvchi"
                type="number"
                inputMode="numeric"
                min={1}
                value={String(form.maxStudents ?? '')}
                onChange={(e) => set('maxStudents', Math.round(Number(e.target.value)) || null)}
              />
            )}
          </div>
          <TextField
            label="Tartib raqami (kichigi oldin)"
            type="number"
            inputMode="numeric"
            value={String(form.sortOrder)}
            onChange={(e) => set('sortOrder', Math.round(Number(e.target.value) || 0))}
          />
        </div>

        <TextField
          label="Qisqa tavsif (landing uchun)"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />

        <div>
          <span className={styles.fieldLabel}>Ochiladigan bo'limlar</span>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => {
              const meta = FEATURE_META[feature];
              return (
                <button
                  key={feature}
                  type="button"
                  className={styles.featureOption}
                  aria-pressed={form.features.includes(feature)}
                  onClick={() => toggle(feature)}
                >
                  <span className={styles.featureTitle}>
                    {form.features.includes(feature) ? '✓ ' : ''}
                    {meta.label}
                  </span>
                  {meta.teacher && <span className={styles.featureWho}>Ustoz: {meta.teacher}</span>}
                  {meta.student && <span className={styles.featureWho}>O'quvchi: {meta.student}</span>}
                </button>
              );
            })}
          </div>
          <p className={styles.hint}>
            O'quvchilar, ularning to'lovlari, mashq, abakus va natijalar har qanday tarifda ochiq.
          </p>
        </div>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => set('isPublic', e.target.checked)}
          />
          Landing sahifada ko'rsatilsin
        </label>
        {tariff && (
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.archived}
              onChange={(e) => set('archived', e.target.checked)}
            />
            Arxivlash (yangi ustozlarga taklif qilinmaydi, mavjudlari qoladi)
          </label>
        )}

        <ErrorMessage>{save.error}</ErrorMessage>
        <div className={styles.formActions}>
          <Button type="submit" disabled={save.pending}>
            Saqlash
          </Button>
          <Button variant="outline" onClick={onDone}>
            Bekor
          </Button>
        </div>
      </form>
    </Card>
  );
}
