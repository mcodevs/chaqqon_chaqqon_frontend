import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Credentials } from '@/application/adminService';
import { addDays } from '@/domain/billing';
import { type TeacherOverview, billingStateOf, ledgerOf, teacherName } from '@/domain/platformStats';
import type { LedgerKind, Tariff } from '@/domain/teacherBilling';
import { CredentialsNotice } from '@/features/teacher/CredentialsNotice';
import { formatCalendarDate, formatSom } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { useAdminLedger, useAdminTariffs, useAdminTeachers, useSchoolToday } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { MenuButton } from '@/shared/ui/MenuButton';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import styles from './Admin.module.css';
import { LedgerList } from './LedgerList';
import { StatTile } from './StatTile';
import { StatusChip } from './StatusChip';
import { TariffPicker } from './TariffPicker';

const MONEY_KINDS = [
  { value: 'payment', label: "To'lov" },
  { value: 'bonus', label: 'Bonus' },
  { value: 'adjustment', label: 'Tuzatish' },
] as const;

/** One teacher: their balance, money the admin records, profile and subscription, and the ledger. */
export function AdminTeacherPage() {
  const { teacherId = '' } = useParams();
  const today = useSchoolToday();
  const range = useMemo(() => ({ from: addDays(today, -29), to: today }), [today]);
  const teachers = useAdminTeachers(range);
  const tariffs = useAdminTariffs();
  const ledger = useAdminLedger();
  const { admin } = useServices();
  const resetPassword = useAsyncAction(admin.resetTeacherPassword);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  if (!teachers || !tariffs || !ledger) {
    return (
      <Card>
        <SkeletonList rows={5} />
      </Card>
    );
  }

  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    return (
      <EmptyState
        icon="🔍"
        title="Ustoz topilmadi"
        action={<Link to="/admin/teachers">Ustozlar ro'yxati</Link>}
      />
    );
  }

  const tariff = tariffs.find((t) => t.id === teacher.tariffId);
  const state = billingStateOf(teacher, tariffs, ledger, today);
  const entries = ledgerOf(ledger, teacher.id).toReversed();
  const charged = entries.some((entry) => entry.kind === 'charge');

  return (
    <div className={styles.page}>
      <Link to="/admin/teachers" className={styles.back}>
        ‹ Ustozlar
      </Link>

      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerName}>{teacherName(teacher)}</h1>
          <span className={styles.rowFacts}>
            <span>@{teacher.username}</span>
            {teacher.phone && <span>{teacher.phone}</span>}
            {teacher.centerName && <span>{teacher.centerName}</span>}
          </span>
        </div>
        <div className={styles.formActions}>
          <StatusChip status={state.status} />
          <MenuButton
            actions={[
              {
                label: 'Parolni yangilash',
                icon: '🔑',
                onSelect: async () => {
                  const next = await resetPassword.run(teacher.id, teacher.username);
                  if (next) setCredentials(next);
                },
              },
            ]}
          />
        </div>
      </div>

      <ErrorMessage>{resetPassword.error}</ErrorMessage>
      {credentials && (
        <CredentialsNotice
          title="Ustozga yangi parolni bering"
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
        />
      )}

      <div className={styles.tiles}>
        <StatTile
          label="Balans"
          value={formatSom(state.balance)}
          tone={state.balance < 0 ? 'negative' : undefined}
          detail={state.monthsCovered > 0 ? `${state.monthsCovered} oyga yetadi` : undefined}
        />
        <StatTile
          label="Keyingi yechim"
          value={state.nextChargeDate ? formatCalendarDate(state.nextChargeDate) : '—'}
          detail={state.nextChargeDate ? formatSom(state.nextChargeAmount) : 'Hisob yuritilmaydi'}
        />
        <StatTile
          label={state.status === 'blocked' ? 'Bloklangan' : 'Blok sanasi'}
          value={state.blockedFrom ? formatCalendarDate(state.blockedFrom) : '—'}
          detail={state.overdueSince ? `Qarz ${formatCalendarDate(state.overdueSince)} dan` : "Qarz yo'q"}
        />
        <StatTile
          label="O'quvchilar"
          value={`${teacher.studentCount}${tariff?.maxStudents ? ` / ${tariff.maxStudents}` : ''}`}
          detail={`7 kunda faol: ${teacher.activeStudents} · 30 kunda ${teacher.practiceCount} mashq`}
        />
      </div>

      <MoneyForm teacherId={teacher.id} tariff={tariff} />

      <TeacherSettingsForm teacher={teacher} tariffs={tariffs} charged={charged} />

      <Card title="Hisob tarixi">
        <LedgerList entries={entries} tariffs={tariffs} />
      </Card>
    </div>
  );
}

/** Money the teacher paid (or a bonus, or a correction), added to their balance. */
function MoneyForm({ teacherId, tariff }: { teacherId: string; tariff: Tariff | undefined }) {
  const { admin } = useServices();
  const record = useAsyncAction(async (...args: Parameters<typeof admin.recordEntry>) => {
    await admin.recordEntry(...args);
    return true;
  });
  const [kind, setKind] = useState<Exclude<LedgerKind, 'charge'>>('payment');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const done = await record.run(teacherId, kind, Math.round(Number(amount)), note);
    if (done !== undefined) {
      setAmount('');
      setNote('');
      setSaved(true);
    }
  };

  return (
    <Card title="Pul yozish">
      <form className={styles.form} onSubmit={submit} noValidate>
        <SegmentedControl label="Turi" options={MONEY_KINDS} value={kind} onChange={setKind} />
        <div className={styles.formGrid}>
          <div>
            <TextField
              label={kind === 'adjustment' ? "Summa (so'm, kamaytirish uchun minus)" : "Summa (so'm)"}
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {tariff && tariff.monthlyPrice > 0 && kind !== 'adjustment' && (
              <div className={styles.chips}>
                {[1, 3, 6].map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={styles.chipButton}
                    aria-pressed={Number(amount) === months * tariff.monthlyPrice}
                    onClick={() => setAmount(String(months * tariff.monthlyPrice))}
                  >
                    {months} oy · {formatSom(months * tariff.monthlyPrice)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TextField
            label="Izoh"
            placeholder="masalan: naqd, Click"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <ErrorMessage>{record.error}</ErrorMessage>
        {saved && <p className={styles.hint}>✓ Yozildi. Ustozga Telegram orqali xabar boradi.</p>}
        <div className={styles.formActions}>
          <Button type="submit" disabled={record.pending || !amount}>
            {kind === 'payment' ? "To'lov qabul qilindi" : 'Yozish'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Profile and subscription. The first billing day is fixed once a fee has been taken. */
function TeacherSettingsForm({
  teacher,
  tariffs,
  charged,
}: {
  teacher: TeacherOverview;
  tariffs: readonly Tariff[];
  charged: boolean;
}) {
  const { admin } = useServices();
  const save = useAsyncAction(async (...args: Parameters<typeof admin.updateTeacher>) => {
    await admin.updateTeacher(...args);
    return true;
  });
  const [form, setForm] = useState({
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    phone: teacher.phone,
    centerName: teacher.centerName,
    tariffId: teacher.tariffId,
    billed: teacher.billingStartsOn !== null,
    billingStartsOn: teacher.billingStartsOn ?? '',
    disabled: teacher.disabledAt !== null,
  });
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const done = await save.run(teacher.id, {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      centerName: form.centerName,
      tariffId: form.tariffId,
      billingStartsOn: form.billed && form.billingStartsOn ? form.billingStartsOn : null,
      disabled: form.disabled,
    });
    if (done !== undefined) setSaved(true);
  };

  return (
    <Card title="Profil va obuna">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            label="Ism *"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
          />
          <TextField
            label="Familiya"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
          <TextField
            label="Telefon"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <TextField
            label="Markaz nomi (ixtiyoriy)"
            value={form.centerName}
            onChange={(e) => set('centerName', e.target.value)}
          />
        </div>

        <TariffPicker tariffs={tariffs} value={form.tariffId} onChange={(id) => set('tariffId', id)} />
        <p className={styles.hint}>
          Yangi tarif narxi keyingi oylik yechimdan qo'llanadi; bo'limlar darhol o'zgaradi.
        </p>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.billed}
            disabled={charged}
            onChange={(e) => set('billed', e.target.checked)}
          />
          Oylik to'lov hisoblansin
        </label>
        {form.billed && (
          <TextField
            label="Hisob boshlanadigan kun"
            type="date"
            value={form.billingStartsOn}
            disabled={charged}
            onChange={(e) => set('billingStartsOn', e.target.value)}
          />
        )}
        {charged && (
          <p className={styles.hint}>
            Oylik yechila boshlagan, shuning uchun bu sana endi o'zgarmaydi. Xatoni tuzatish uchun "Tuzatish"
            yozing.
          </p>
        )}

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.disabled}
            onChange={(e) => set('disabled', e.target.checked)}
          />
          Akkauntni to'xtatish (boshqaruv yopiladi, oylik yechilmaydi)
        </label>

        <ErrorMessage>{save.error}</ErrorMessage>
        {saved && <p className={styles.hint}>✓ Saqlandi.</p>}
        <div className={styles.formActions}>
          <Button type="submit" variant="secondary" disabled={save.pending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}
