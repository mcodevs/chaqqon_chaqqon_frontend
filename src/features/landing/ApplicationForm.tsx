import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { HEARD_FROM_OPTIONS } from '@/domain/applications';
import type { Tariff } from '@/domain/teacherBilling';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './ApplicationForm.module.css';
import { referralHint } from './content/landingCopy';
import motion from './motion/motion.module.css';

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

/** Whether any field inside the folded "Qo'shimcha ma'lumot" box holds an answer. */
function hasOptionalAnswers(form: typeof EMPTY): boolean {
  return [
    form.studentsCount,
    form.telegramUsername,
    form.city,
    form.centerName,
    form.heardFrom,
    form.note,
  ].some((value) => value.trim() !== '');
}

/** The teacher's application: name and phone, and whatever else helps the first call. */
export function ApplicationForm({
  tariffs,
  chosenTariffId,
  choiceSeq,
  referralEnabled,
  referrer,
  studentsCount = null,
  contact = null,
}: {
  tariffs: readonly Tariff[];
  chosenTariffId: string | null;
  /** Counts the tariff cards' apply clicks; a new value puts chosenTariffId into the form again. */
  choiceSeq: number;
  /** The admin rewards a colleague's recommendation, so the form asks who it was. */
  referralEnabled: boolean;
  /** The login from a colleague's invite link, already normalized; '' when there was none. */
  referrer: string;
  /** Picked in the tariffs' student-count chooser; null leaves the field as it is. */
  studentsCount?: number | null;
  /** The platform's phone and Telegram, for the thank-you; null when the admin has set none. */
  contact?: string | null;
}) {
  const { applications } = useServices();
  const [form, setForm] = useState({
    ...EMPTY,
    tariffId: chosenTariffId,
    referrerUsername: referrer,
    studentsCount: studentsCount === null ? '' : String(studentsCount),
  });
  // The optional fields stay folded away, unless one already holds an answer the teacher should see.
  const [detailsOpen, setDetailsOpen] = useState(studentsCount !== null);
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

  // A tariff picked from the cards above wins until the teacher picks another here. Each card click
  // bumps the count, so picking the same card again still overrides a chip chosen in between.
  const [lastSeq, setLastSeq] = useState(choiceSeq);
  if (choiceSeq !== lastSeq) {
    setLastSeq(choiceSeq);
    setForm((current) => ({ ...current, tariffId: chosenTariffId }));
  }

  // The same for the student count, except that clearing the chooser keeps what the field holds.
  const [lastStudents, setLastStudents] = useState(studentsCount);
  if (studentsCount !== lastStudents) {
    setLastStudents(studentsCount);
    if (studentsCount !== null) {
      setForm((current) => ({ ...current, studentsCount: String(studentsCount) }));
      setDetailsOpen(true);
    }
  }

  // On a phone the tariff chips scroll sideways in their own row, so the chosen chip must always be
  // in sight. The default answer, "Hali bilmayman", leads the row, so the row opens on what is
  // chosen. A choice made elsewhere (a tariff card's apply button) or a chip half under an edge is
  // nudged fully into view, by the row alone, never the page. The row's scroll padding is the edge
  // fade's width, so the chip lands clear of the fade.
  const tariffRow = useRef<HTMLDivElement>(null);
  const hasTariffs = tariffs.length > 0;
  useEffect(() => {
    const row = tariffRow.current;
    const chosen = row?.querySelector('[aria-pressed="true"]');
    if (!row || !chosen) return;
    const style = getComputedStyle(row);
    const startPad = parseFloat(style.scrollPaddingLeft) || parseFloat(style.paddingLeft) || 0;
    const endPad = parseFloat(style.scrollPaddingRight) || parseFloat(style.paddingRight) || 0;
    const edge = row.getBoundingClientRect();
    const chip = chosen.getBoundingClientRect();
    if (chip.left < edge.left + startPad) row.scrollLeft -= edge.left + startPad - chip.left;
    else if (chip.right > edge.right - endPad) row.scrollLeft += chip.right - (edge.right - endPad);
  }, [form.tariffId, hasTariffs]);

  const tariffLabelId = useId();
  const sourceLabelId = useId();
  const hintId = useId();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (await submit.run()) setSent(true);
    // The problem may be in a folded field (a count, an over-long note): show the answers given there.
    else if (hasOptionalAnswers(form)) setDetailsOpen(true);
  };

  if (sent) return <Sent contact={contact} />;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <TextField
          label="Ism va familiya *"
          autoComplete="name"
          aria-required="true"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
        />
        <TextField
          label="Telefon raqami *"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-required="true"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>

      {hasTariffs && (
        <div className={styles.choiceBlock}>
          <span id={tariffLabelId} className={styles.choiceLabel}>
            Qaysi tarif qiziqtiradi?
          </span>
          <ChipRow rowRef={tariffRow} labelledBy={tariffLabelId}>
            {/* First: it is the default, and a phone's row opens on its start. */}
            <Chip pressed={form.tariffId === null} onClick={() => set('tariffId', null)}>
              Hali bilmayman
            </Chip>
            {tariffs.map((tariff) => (
              <Chip
                key={tariff.id}
                pressed={form.tariffId === tariff.id}
                onClick={() => set('tariffId', form.tariffId === tariff.id ? null : tariff.id)}
              >
                {tariff.name}
              </Chip>
            ))}
          </ChipRow>
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
            hint={referralHint(referralEnabled)}
          />
        </div>
      )}

      <details
        className={styles.details}
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary className={styles.detailsSummary}>
          <span className={styles.detailsText}>
            <span className={styles.detailsTitle}>Qo'shimcha ma'lumot (ixtiyoriy)</span>
            <span className={styles.detailsHint}>Birinchi suhbatni tezlashtiradi</span>
          </span>
          <span className={styles.chevron} aria-hidden="true" />
        </summary>

        <div className={styles.detailsBody}>
          <div className={styles.formGrid}>
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
            {/* A hint, not a placeholder: the sentence is cut off in a phone-wide field. */}
            <TextField
              label="Markaz nomi"
              value={form.centerName}
              onChange={(e) => set('centerName', e.target.value)}
              hint="Markazsiz ishlasangiz, bo'sh qoldiring."
            />
          </div>

          <div className={styles.choiceBlock}>
            <span id={sourceLabelId} className={styles.choiceLabel}>
              Platforma haqida qayerdan eshitdingiz?
            </span>
            <ChipRow labelledBy={sourceLabelId}>
              {[...HEARD_FROM_OPTIONS, 'Boshqa'].map((source) => (
                <Chip
                  key={source}
                  pressed={form.heardFrom === source}
                  onClick={() => set('heardFrom', form.heardFrom === source ? '' : source)}
                >
                  {source}
                </Chip>
              ))}
            </ChipRow>
            {form.heardFrom === 'Boshqa' && (
              <div className={`${styles.extraField} ${motion.rise}`}>
                <TextField
                  label="Qayerdan?"
                  value={form.otherSource}
                  onChange={(e) => set('otherSource', e.target.value)}
                />
              </div>
            )}
          </div>

          <TextField label="Izoh" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </details>

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

      <div className={styles.actions}>
        <ErrorMessage>{submit.error}</ErrorMessage>
        <Button type="submit" size="lg" block disabled={submit.pending} aria-describedby={hintId}>
          {submit.pending ? 'Yuborilmoqda…' : 'Ariza yuborish'}
        </Button>
        <p id={hintId} className={styles.formHint}>
          Majburiy maydonlar: ism va telefon. Qolganlari ixtiyoriy.
        </p>
      </div>
    </form>
  );
}

/**
 * A row of chips. On a phone it scrolls sideways inside itself, and an edge that hides more chips
 * fades wider (data-more-start / data-more-end, written on the DOM like Reveal's state, so scrolling
 * never re-renders). A row that happens to end on a whole chip still says "there is more"; once the
 * end is reached the fade narrows, so the last chip is never dimmed at rest.
 */
function ChipRow({
  labelledBy,
  rowRef,
  children,
}: {
  labelledBy: string;
  /** The scroll box, for a parent that nudges the chosen chip into view. */
  rowRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const ownRow = useRef<HTMLDivElement>(null);
  const row = rowRef ?? ownRow;

  useEffect(() => {
    const box = row.current;
    if (!box) return;
    const update = () => {
      const hidden = box.scrollWidth - box.clientWidth;
      box.toggleAttribute('data-more-start', hidden > 1 && box.scrollLeft > 1);
      box.toggleAttribute('data-more-end', hidden > 1 && box.scrollLeft < hidden - 1);
    };
    update();
    box.addEventListener('scroll', update, { passive: true });
    // The box changes width with the screen, its chips with a tick, a font or a folded box opening.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(box);
    if (box.firstElementChild) resize?.observe(box.firstElementChild);
    return () => {
      box.removeEventListener('scroll', update);
      resize?.disconnect();
    };
  }, [row]);

  return (
    <div ref={row} className={styles.chipScroller}>
      <div className={styles.chips} role="group" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

/**
 * One answer in a row of toggles. Chosen is said three ways, never by colour alone: aria-pressed,
 * a tint and a tick.
 */
function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={styles.chip} aria-pressed={pressed} onClick={onClick}>
      {pressed && (
        <span className={styles.chipCheck} aria-hidden="true">
          ✓
        </span>
      )}
      <span className={styles.chipLabel}>{children}</span>
    </button>
  );
}

/** The thank-you that replaces the form. `data-sent` lets the card around it cheer. */
function Sent({ contact }: { contact: string | null }) {
  const title = useRef<HTMLHeadingElement>(null);

  // The fields the teacher was typing in are gone, so focus lands on the answer, not on the page.
  useEffect(() => {
    title.current?.focus();
  }, []);

  return (
    <div className={styles.sent} data-sent="true">
      <span className={`${styles.sentIcon} ${motion.pop}`} aria-hidden="true">
        ✅
      </span>
      <h3
        ref={title}
        tabIndex={-1}
        className={`${styles.sentTitle} ${motion.rise}`}
        style={{ '--lp-delay': '120ms' } as CSSProperties}
      >
        Arizangiz qabul qilindi!
      </h3>
      <p className={`${styles.sentText} ${motion.rise}`} style={{ '--lp-delay': '180ms' } as CSSProperties}>
        Tez orada siz bilan bog'lanib, akkauntingizni ochib beramiz.
      </p>
      {contact && (
        <p
          className={`${styles.sentContact} ${motion.rise}`}
          style={{ '--lp-delay': '240ms' } as CSSProperties}
        >
          Savolingiz bo'lsa: {contact}
        </p>
      )}
    </div>
  );
}
