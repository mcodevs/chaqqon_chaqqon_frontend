import { type FormEvent, useState } from 'react';
import type { TeacherAccountView } from '@/application/accountService';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Subscription.module.css';

/** The teacher's own name, phone and (optional) centre: shown to students and on printed sheets. */
export function TeacherProfileForm({ account }: { account: TeacherAccountView }) {
  const { account: accountService } = useServices();
  const save = useAsyncAction(async (...args: Parameters<typeof accountService.updateProfile>) => {
    await accountService.updateProfile(...args);
    return true;
  });
  const [form, setForm] = useState({
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
    centerName: account.centerName,
  });
  const [saved, setSaved] = useState(false);
  const set = (key: keyof typeof form, value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const done = await save.run(form);
    if (done !== undefined) setSaved(true);
  };

  return (
    <Card title="Mening ma'lumotlarim">
      <form onSubmit={submit} noValidate>
        <TextField label="Ism *" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        <TextField label="Familiya" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <TextField
          label="Telefon"
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <TextField
          label="Markaz nomi (ixtiyoriy)"
          placeholder="Markazsiz ishlasangiz, bo'sh qoldiring"
          value={form.centerName}
          onChange={(e) => set('centerName', e.target.value)}
        />
        <ErrorMessage>{save.error}</ErrorMessage>
        {saved && <p className={styles.hint}>✓ Saqlandi.</p>}
        <Button type="submit" variant="secondary" disabled={save.pending}>
          Saqlash
        </Button>
      </form>
    </Card>
  );
}
