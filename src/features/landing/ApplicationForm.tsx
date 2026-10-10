import { type FormEvent, useState } from 'react';
import { HEARD_FROM_OPTIONS } from '@/domain/applications';
import type { Tariff } from '@/domain/teacherBilling';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './Landing.module.css';

const EMPTY = {
  fullName: '',
  phone: '+998 ',
  studentsCount: '',
  telegramUsername: '',
  city: '',
  centerName: '',
  heardFrom: '',
  otherSource: '',
  tariffId: null as string | null,
  note: '',
  referrerUsername: '',
  // Left empty by people; bots fill every field they find.
  website: '',
};

/** The teacher's application: name and phone, and whatever else helps the first call. */
export function ApplicationForm({
  tariffs,
  chosenTariffId,
  referralEnabled,
  referrer,
}: {
  tariffs: readonly Tariff[];
  chosenTariffId: string | null;
  /** The admin rewards a colleague's recommendation, so the form asks who it was. */
  referralEnabled: boolean;
  /** The login from a colleague's invite link, already normalized; '' when there was none. */
  referrer: string;
}) {
  const { applications } = useServices();
  const [form, setForm] = useState({ ...EMPTY, tariffId: chosenTariffId, referrerUsername: referrer });
  const [sent, setSent] = useState(false);
  const submit = useAsyncAction(async () => {
    if (form.website) return true;
    await applications.submit({
      fullName: form.fullName,
      phone: form.phone,
      studentsCount: form.studentsCount.trim() === '' ? null : Number(form.studentsCount),
      telegramUsername: form.telegramUsername,
      city: form.city,
      centerName: form.centerName,
      heardFrom: form.heardFrom === 'Boshqa' ? form.otherSource : form.heardFrom,
      tariffId: form.tariffId,
      note: form.note,
      referrerUsername: form.referrerUsername,
    });
    return true;
  });

  // A tariff picked from the cards above wins until the teacher picks another here.
  const [lastChosen, setLastChosen] = useState(chosenTariffId);
  if (chosenTariffId !== lastChosen) {
    setLastChosen(chosenTariffId);
    setForm((current) => ({ ...current, tariffId: chosenTariffId }));
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (await submit.run()) setSent(true);
  };

  if (sent) {
    return (
      <div className={styles.sent} role="status">
        <span className={styles.sentIcon} aria-hidden="true">
          ✅
        </span>
        <h3 className={styles.sentTitle}>Arizangiz qabul qilindi!</h3>
        <p className={styles.sentText}>Tez orada siz bilan bog'lanib, akkauntingizni ochib beramiz.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <TextField
          label="Ism va familiya *"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
        />
        <TextField
          label="Telefon raqam *"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <TextField
          label="O'quvchilar soni"
          type="number"
          inputMode="numeric"
          min={0}
          value={form.studentsCount}
          onChange={(e) => set('studentsCount', e.target.value)}
        />
        <TextField
          label="Telegram username"
          placeholder="@username"
          autoCapitalize="none"
          value={form.telegramUsername}
          onChange={(e) => set('telegramUsername', e.target.value)}
        />
        <TextField label="Shahar" value={form.city} onChange={(e) => set('city', e.target.value)} />
        <TextField
          label="Markaz nomi"
          placeholder="Markazsiz ishlasangiz, bo'sh qoldiring"
          value={form.centerName}
          onChange={(e) => set('centerName', e.target.value)}
        />
      </div>

      <div className={styles.choiceBlock}>
        <span className={styles.choiceLabel}>Platforma haqida qayerdan eshitdingiz?</span>
        <div className={styles.chips}>
          {[...HEARD_FROM_OPTIONS, 'Boshqa'].map((source) => (
            <button
              key={source}
              type="button"
              className={styles.chip}
              aria-pressed={form.heardFrom === source}
              onClick={() => set('heardFrom', form.heardFrom === source ? '' : source)}
            >
              {source}
            </button>
          ))}
        </div>
        {form.heardFrom === 'Boshqa' && (
          <TextField
            label="Qayerdan?"
            value={form.otherSource}
            onChange={(e) => set('otherSource', e.target.value)}
          />
        )}
      </div>

      {tariffs.length > 0 && (
        <div className={styles.choiceBlock}>
          <span className={styles.choiceLabel}>Qaysi tarif qiziqtiradi?</span>
          <div className={styles.chips}>
            {tariffs.map((tariff) => (
              <button
                key={tariff.id}
                type="button"
                className={styles.chip}
                aria-pressed={form.tariffId === tariff.id}
                onClick={() => set('tariffId', form.tariffId === tariff.id ? null : tariff.id)}
              >
                {tariff.name}
              </button>
            ))}
            <button
              type="button"
              className={styles.chip}
              aria-pressed={form.tariffId === null}
              onClick={() => set('tariffId', null)}
            >
              Hali bilmayman
            </button>
          </div>
        </div>
      )}

      {(referralEnabled || referrer) && (
        <div className={styles.choiceBlock}>
          {referrer && (
            <p className={styles.referralNote}>
              🤝 Sizni <strong>@{referrer}</strong> taklif qildi.
            </p>
          )}
          <TextField
            label="Sizni kim taklif qildi? (ustozning logini)"
            placeholder="Masalan: @mohira"
            autoCapitalize="none"
            autoComplete="off"
            value={form.referrerUsername}
            onChange={(e) => set('referrerUsername', e.target.value)}
            hint="Ixtiyoriy. Akkauntingiz ochilsa, sizni taklif qilgan ustoz 1 oy bepul oladi."
          />
        </div>
      )}

      <TextField label="Izoh" value={form.note} onChange={(e) => set('note', e.target.value)} />

      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Sayt
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </label>
      </div>

      <ErrorMessage>{submit.error}</ErrorMessage>
      <Button type="submit" size="lg" block disabled={submit.pending}>
        Ariza yuborish
      </Button>
      <p className={styles.formHint}>Majburiy maydonlar: ism va telefon. Qolganlari ixtiyoriy.</p>
    </form>
  );
}
