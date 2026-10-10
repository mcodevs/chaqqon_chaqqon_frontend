import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlatformSettings } from '@/application/ports';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { usePlatformSettings } from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Admin.module.css';

/** How teachers reach the admin to pay: shown on their lock page, banner, reminders and the landing page. */
export function AdminSettingsPage() {
  const { signOut } = useSession();
  const settings = usePlatformSettings();

  return (
    <div className={styles.page}>
      {settings ? <ContactForm initial={settings} /> : <SkeletonList rows={2} avatar={false} />}

      <Card title="Tariflar">
        <p className={styles.hint}>Narx, o'quvchi limiti va ochiladigan bo'limlar.</p>
        <Link to="/admin/tariffs" className={styles.back}>
          🏷️ Tariflarni boshqarish ›
        </Link>
      </Card>

      <Card title="Ko'rinish">
        <ThemeToggle />
      </Card>

      <div>
        <Button variant="ghost" tone="neutral" onClick={signOut}>
          🚪 Tizimdan chiqish
        </Button>
      </div>
    </div>
  );
}

function ContactForm({ initial }: { initial: PlatformSettings }) {
  const { admin } = useServices();
  const save = useAsyncAction(async (...args: Parameters<typeof admin.saveSettings>) => {
    await admin.saveSettings(...args);
    return true;
  });
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const done = await save.run(form);
    if (done !== undefined) setSaved(true);
  };

  return (
    <Card title="To'lov uchun aloqa">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            label="Telefon raqam"
            type="tel"
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            value={form.contactPhone}
            onChange={(e) => setForm((current) => ({ ...current, contactPhone: e.target.value }))}
          />
          <TextField
            label="Telegram username"
            placeholder="@username"
            autoCapitalize="none"
            value={form.contactTelegram}
            onChange={(e) => setForm((current) => ({ ...current, contactTelegram: e.target.value }))}
          />
        </div>
        <p className={styles.hint}>
          Ustozlar buni balans banneri, blok sahifasi va Telegram eslatmalarida ko'radi.
        </p>
        <ErrorMessage>{save.error}</ErrorMessage>
        {saved && <p className={styles.hint}>✓ Saqlandi.</p>}
        <div className={styles.formActions}>
          <Button type="submit" disabled={save.pending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}
