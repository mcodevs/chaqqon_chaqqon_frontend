import { useEffect, useMemo, useState } from 'react';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { teacherDisplayName, useMyTeacherCard } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';
import { drawResultCard } from './drawResultCard';
import { resultCardData, shareFileName, shareText } from './resultCard';
import { canShareImage, saveImage, shareImage } from './shareImage';
import styles from './Share.module.css';

interface ShareResultProps {
  /** What the result is: "Interaktiv uy vazifasi". */
  title: string;
  name: string;
  /** The drill in one line — see `drillDetail`. */
  detail: string;
  correct: number;
  total: number;
  /** Tashkent day, 'YYYY-MM-DD'. */
  today: string;
}

const OUTCOME_NOTE = {
  shared: 'Ulashildi ✓',
  saved: 'Rasm saqlandi ✓',
  cancelled: null,
} as const;

/**
 * The finished result as a picture the child can send to their family. It is drawn as soon as
 * the result is in, so the picture is on screen — and already correct — before anything is tapped.
 */
export function ShareResult({ title, name, detail, correct, total, today }: ShareResultProps) {
  // The footer names the child's own teacher; the picture waits for it rather than drawing twice.
  const card = useMyTeacherCard();
  const teacher = card === undefined ? undefined : teacherDisplayName(card);
  // Primitives in, so the picture is redrawn when the result changes and never on a re-render.
  const data = useMemo(
    () =>
      teacher === undefined
        ? null
        : resultCardData({ title, name, detail, correct, total, date: today, teacher }),
    [title, name, detail, correct, total, today, teacher],
  );

  const [picture, setPicture] = useState<{ blob: Blob; url: string } | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    let url: string | null = null;
    let cancelled = false;

    drawResultCard(data)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPicture({ blob, url });
      })
      .catch((error: unknown) => {
        if (!cancelled) setDrawError(error instanceof Error ? error.message : 'Rasm tayyorlanmadi');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data]);

  const fileName = data ? shareFileName(data) : '';
  const share = useAsyncAction(async () => {
    if (!picture || !data) return;
    const outcome = await shareImage({
      blob: picture.blob,
      fileName,
      title: data.title,
      text: shareText(data),
    });
    setNote(OUTCOME_NOTE[outcome]);
  });

  if (drawError) return <ErrorMessage>{drawError}</ErrorMessage>;

  const canShare = picture !== null && canShareImage(picture.blob, fileName);

  return (
    <div className={styles.block}>
      <p className={styles.lead}>Natijangni ota-onangga yoki do‘stlaringga yuboring!</p>

      <div className={styles.preview}>
        {picture ? (
          <img src={picture.url} alt={`${name} natijasi: ${correct}/${total}`} className={styles.image} />
        ) : (
          <div className={styles.placeholder} role="status">
            Rasm tayyorlanmoqda…
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {canShare && (
          <Button size="lg" block disabled={share.pending} onClick={() => void share.run()}>
            📤 Ulashish
          </Button>
        )}
        <Button
          size="lg"
          block
          variant={canShare ? 'outline' : 'primary'}
          disabled={!picture}
          onClick={() => picture && (saveImage(picture.blob, fileName), setNote(OUTCOME_NOTE.saved))}
        >
          ⬇️ Rasmni saqlash
        </Button>
      </div>

      {/* Some in-app browsers block both; holding the picture always works on a phone. */}
      <p className={styles.hint}>Rasmni bosib turib ham saqlab olish mumkin.</p>
      {note && <p className={styles.note}>{note}</p>}
      <ErrorMessage>{share.error}</ErrorMessage>
    </div>
  );
}
