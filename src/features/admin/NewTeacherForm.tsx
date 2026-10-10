import { type FormEvent, useState } from 'react';
import type { Credentials } from '@/application/adminService';
import type { Tariff } from '@/domain/teacherBilling';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { useSchoolToday } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Admin.module.css';
import { TariffPicker } from './TariffPicker';

export interface NewTeacherPrefill {
  firstName?: string;
  lastName?: string;
  phone?: string;
  centerName?: string;
  tariffId?: string | null;
}

interface NewTeacherFormProps {
  tariffs: readonly Tariff[];
  prefill?: NewTeacherPrefill;
  onCreated: (teacherId: string, credentials: Credentials) => void;
  onCancel: () => void;
}

/** The admin creates a teacher's sign-in, tariff and first billing day in one go. */
export function NewTeacherForm({ tariffs, prefill, onCreated, onCancel }: NewTeacherFormProps) {
  const { admin } = useServices();
  const today = useSchoolToday();
  const offered = tariffs.filter((t) => !t.archivedAt);
  const [form, setForm] = useState(() => {
    const firstName = prefill?.firstName ?? '';
    return {
      firstName,
      lastName: prefill?.lastName ?? '',
      phone: prefill?.phone ?? '',
      centerName: prefill?.centerName ?? '',
      ...admin.suggestCredentials(firstName),
      tariffId: prefill?.tariffId ?? offered[0]?.id ?? '',
      billed: true,
      billingStartsOn: today,
      bonus: '0',
    };
  });
  const [loginTouched, setLoginTouched] = useState(false);
  const create = useAsyncAction(admin.createTeacher);
  const tariff = tariffs.find((t) => t.id === form.tariffId);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const created = await create.run({
      username: form.username,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      centerName: form.centerName,
      tariffId: form.tariffId,
      billingStartsOn: form.billed ? form.billingStartsOn : null,
      bonus: Number(form.bonus) || 0,
    });
    if (created) onCreated(created.id, created.credentials);
  };

  return (
    <Card title="Yangi ustoz">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            label="Ism *"
            value={form.firstName}
            onChange={(e) => {
              const firstName = e.target.value;
              // The suggested login follows the name until the admin types one of their own.
              setForm((current) => ({
                ...current,
                firstName,
                username: loginTouched ? current.username : admin.suggestCredentials(firstName).username,
              }));
            }}
          />
          <TextField
            label="Familiya"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
          <TextField
            label="Telefon"
            type="tel"
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <TextField
            label="Markaz nomi (ixtiyoriy)"
            value={form.centerName}
            onChange={(e) => set('centerName', e.target.value)}
          />
          <TextField
            label="Login"
            autoCapitalize="none"
            value={form.username}
            onChange={(e) => {
              setLoginTouched(true);
              set('username', e.target.value);
            }}
          />
          <TextField label="Parol" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </div>

        <TariffPicker tariffs={offered} value={form.tariffId} onChange={(id) => set('tariffId', id)} />

        <label className={styles.check}>
          <input type="checkbox" checked={form.billed} onChange={(e) => set('billed', e.target.checked)} />
          Oylik to'lov hisoblansin
        </label>
        {form.billed && (
          <div className={styles.formGrid}>
            <TextField
              label="Hisob boshlanadigan kun"
              type="date"
              value={form.billingStartsOn}
              onChange={(e) => set('billingStartsOn', e.target.value)}
            />
            <div>
              <TextField
                label="Boshlang'ich bonus (so'm)"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.bonus}
                onChange={(e) => set('bonus', e.target.value)}
              />
              {tariff && tariff.monthlyPrice > 0 && (
                <div className={styles.chips}>
                  {[0, 1].map((months) => (
                    <button
                      key={months}
                      type="button"
                      className={styles.chipButton}
                      aria-pressed={Number(form.bonus) === months * tariff.monthlyPrice}
                      onClick={() => set('bonus', String(months * tariff.monthlyPrice))}
                    >
                      {months === 0 ? 'Bonussiz' : '1 oy bepul'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <p className={styles.hint}>
          Birinchi oylik shu kuni balansdan yechiladi. Bonus (masalan, sinov oyi) balansga oldindan
          qo'shiladi.
        </p>

        <ErrorMessage>{create.error}</ErrorMessage>
        <div className={styles.formActions}>
          <Button type="submit" disabled={create.pending}>
            Ustozni yaratish
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Bekor
          </Button>
        </div>
      </form>
    </Card>
  );
}
