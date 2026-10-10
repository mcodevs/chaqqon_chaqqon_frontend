import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { MAX_OFFER_DAYS } from '@/application/platformService';
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

/** How teachers reach the admin to pay, and the offer the landing page makes to new teachers. */
export function AdminSettingsPage() {
  const { signOut } = useSession();
  const settings = usePlatformSettings();

  return (
    <div className={styles.page}>
      {settings ? (
        <>
          <ContactForm settings={settings} />
          <OfferForm settings={settings} />
        </>
      ) : (
        <SkeletonList rows={2} avatar={false} />
      )}

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

/**
 * Saves part of the settings on top of the latest ones, so one form never puts back what the other
 * just changed. Success is spelled out because the save itself returns nothing.
 */
function useSaveSettings(settings: PlatformSettings) {
  const { admin } = useServices();
  const [saved, setSaved] = useState(false);
  const save = useAsyncAction(async (changes: Partial<PlatformSettings>) => {
    await admin.saveSettings({ ...settings, ...changes });
    return true;
  });
  const run = async (changes: Partial<PlatformSettings>) => {
    setSaved(false);
    if ((await save.run(changes)) !== undefined) setSaved(true);
  };
  return { run, saved, pending: save.pending, error: save.error };
}

function ContactForm({ settings }: { settings: PlatformSettings }) {
  const save = useSaveSettings(settings);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [contactTelegram, setContactTelegram] = useState(settings.contactTelegram);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save.run({ contactPhone, contactTelegram });
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
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <TextField
            label="Telegram username"
            placeholder="@username"
            autoCapitalize="none"
            value={contactTelegram}
            onChange={(e) => setContactTelegram(e.target.value)}
          />
        </div>
        <p className={styles.hint}>
          Ustozlar buni balans banneri, blok sahifasi va Telegram eslatmalarida ko'radi.
        </p>
        <ErrorMessage>{save.error}</ErrorMessage>
        {save.saved && <p className={styles.hint}>✓ Saqlandi.</p>}
        <div className={styles.formActions}>
          <Button type="submit" variant="secondary" disabled={save.pending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Days stay text while typed; an empty or broken field is NaN, which saving refuses. */
const days = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));

function OfferForm({ settings }: { settings: PlatformSettings }) {
  const save = useSaveSettings(settings);
  const [trialDays, setTrialDays] = useState(String(settings.trialDays));
  const [moneyBackDays, setMoneyBackDays] = useState(String(settings.moneyBackDays));
  const [referralEnabled, setReferralEnabled] = useState(settings.referralEnabled);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save.run({ trialDays: days(trialDays), moneyBackDays: days(moneyBackDays), referralEnabled });
  };

  return (
    <Card title="Yangi ustozlarga taklif">
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            label="Bepul sinov, kun"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_OFFER_DAYS}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            hint="Yangi ustozning birinchi oylik to'lovi shuncha kundan keyin yechiladi. 0 — sinovsiz."
          />
          <TextField
            label="Pulni qaytarish kafolati, kun"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_OFFER_DAYS}
            value={moneyBackDays}
            onChange={(e) => setMoneyBackDays(e.target.value)}
            hint="Landing'da «shu muddatda yoqmasa, pulni qaytaramiz» deb yoziladi. 0 — ko'rsatilmaydi."
          />
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={referralEnabled}
            onChange={(e) => setReferralEnabled(e.target.checked)}
          />
          Hamkasbini taklif qilgan ustozga 1 oy bepul
        </label>
        <p className={styles.hint}>
          Bonus faqat taklif qilgan ustozga yoziladi: yangi ustoz o'z bonusini o'zi boshqani taklif qilib
          oladi. Taklif havolasi ustozning profilida chiqadi. Tavsiya bilan kelgan arizadan ustoz
          yaratganingizda, tavsiyachiga uning tarifidagi 1 oylik bonus bir bosishda yoziladi. Qaytarish va
          bonuslarni siz boshqarasiz — tizim faqat va'dani ko'rsatadi.
        </p>
        <ErrorMessage>{save.error}</ErrorMessage>
        {save.saved && <p className={styles.hint}>✓ Saqlandi.</p>}
        <div className={styles.formActions}>
          <Button type="submit" variant="secondary" disabled={save.pending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}
