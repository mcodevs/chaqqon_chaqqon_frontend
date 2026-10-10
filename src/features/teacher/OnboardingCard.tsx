import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type OnboardingStepId, onboardingProgress, onboardingSteps } from '@/domain/onboarding';
import {
  useActiveRooms,
  useMarketItems,
  useMyFeatures,
  usePayments,
  useResults,
  useStudentAccounts,
  useTeacherAccount,
} from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { Button } from '@/shared/ui/Button';
import styles from './Onboarding.module.css';

const STEP_TEXT: Record<OnboardingStepId, { title: string; text: string; to?: string }> = {
  profile: {
    title: 'Ismingiz va telefoningizni kiriting',
    text: "O'quvchilar va ota-onalar sizni shu ism bilan ko'radi.",
    to: '/teacher/profile',
  },
  student: { title: "Birinchi o'quvchini qo'shing", text: 'Unga login va parol beriladi.' },
  payment: {
    title: "O'quvchi to'lovini belgilang",
    text: "Ro'yxatda «To'ladi»ni bosing — shundan keyin o'quvchining profili ochiladi.",
  },
  homework: {
    title: 'Birinchi uy vazifasini bering',
    text: "Natija va xatolar darhol sizga ko'rinadi.",
    to: '/teacher/competition',
  },
  market: {
    title: "Do'konga sovg'a qo'ying",
    text: "Yulduzcha yig'gan bola nimaga intilishini ko'radi.",
    to: '/teacher/market',
  },
};

type Stored = 'done' | 'hidden';
const storageKey = (teacherId: string) => `chaqqon.onboarding:${teacherId}`;

function readStored(teacherId: string): Stored | null {
  try {
    const value = localStorage.getItem(storageKey(teacherId));
    return value === 'done' || value === 'hidden' ? value : null;
  } catch {
    return null;
  }
}

function writeStored(teacherId: string, value: Stored) {
  try {
    localStorage.setItem(storageKey(teacherId), value);
  } catch {
    // Without storage the card simply comes back next time.
  }
}

/**
 * A new teacher's first steps on their home page. Once every step is done, or the teacher hides it,
 * it stays away in this browser without loading anything again.
 */
export function OnboardingCard({ onAddStudent }: { onAddStudent: () => void }) {
  const { session } = useSession();
  const teacherId = session?.role === 'teacher' ? session.teacherId : null;
  const [stored, setStored] = useState(() => (teacherId ? readStored(teacherId) : 'hidden'));
  if (!teacherId || stored) return null;

  const close = (value: Stored) => {
    writeStored(teacherId, value);
    setStored(value);
  };
  return <Checklist onAddStudent={onAddStudent} onClose={close} />;
}

function Checklist({
  onAddStudent,
  onClose,
}: {
  onAddStudent: () => void;
  onClose: (value: Stored) => void;
}) {
  const account = useTeacherAccount();
  const students = useStudentAccounts();
  const payments = usePayments();
  const features = useMyFeatures();
  const rooms = useActiveRooms();
  const results = useResults();
  const items = useMarketItems();

  const loaded = account && students && payments && features && rooms && results && items;
  const steps = loaded
    ? onboardingSteps({
        profileComplete: account.firstName.trim() !== '' && account.phone.trim() !== '',
        students: students.length,
        payments: payments.length,
        homeworkGiven: rooms.length > 0 || results.some((result) => result.roomId !== null),
        marketItems: items.length,
        features,
      })
    : null;
  const progress = steps ? onboardingProgress(steps) : null;
  const complete = progress !== null && progress.done === progress.total;

  // A teacher who has done it all (an old account, or the last step just now) never sees it again.
  useEffect(() => {
    if (complete) onClose('done');
  }, [complete, onClose]);

  if (!steps || !progress || complete) return null;

  return (
    <section className={styles.card} aria-labelledby="onboarding-title">
      <div className={styles.head}>
        <h3 id="onboarding-title" className={styles.title}>
          🚀 Boshlash · {progress.done}/{progress.total}
        </h3>
        <Button size="sm" variant="ghost" tone="neutral" onClick={() => onClose('hidden')}>
          Yashirish
        </Button>
      </div>
      <div
        className={styles.meter}
        role="progressbar"
        aria-label="Bajarilgan qadamlar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
      >
        <div className={styles.meterFill} style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((step) => {
          const text = STEP_TEXT[step.id];
          return (
            <li key={step.id} className={styles.step} data-done={step.done}>
              <span className={styles.mark} aria-hidden="true">
                {step.done ? '✓' : ''}
              </span>
              <span className={styles.body}>
                <span className={styles.stepTitle}>
                  {text.title}
                  {step.done && <span className={styles.srOnly}> — bajarildi</span>}
                </span>
                {!step.done && <span className={styles.stepText}>{text.text}</span>}
              </span>
              {!step.done && step.id === 'student' && (
                <button type="button" className={styles.go} onClick={onAddStudent}>
                  Qo'shish ›
                </button>
              )}
              {!step.done && text.to && (
                <Link to={text.to} className={styles.go}>
                  Ochish ›
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
