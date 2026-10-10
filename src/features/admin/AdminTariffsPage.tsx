import { useMemo, useState } from 'react';
import { addDays } from '@/domain/billing';
import type { Tariff } from '@/domain/teacherBilling';
import { useAdminTariffs, useAdminTeachers, useSchoolToday } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './Tariffs.module.css';
import { TariffCard } from './TariffCard';
import { TariffForm } from './TariffForm';

/** Tariffs: price, student limit and the sections they open. Shown on the landing page when public. */
export function AdminTariffsPage() {
  const tariffs = useAdminTariffs();
  const today = useSchoolToday();
  const range = useMemo(() => ({ from: addDays(today, -29), to: today }), [today]);
  const teachers = useAdminTeachers(range);
  const [editing, setEditing] = useState<Tariff | 'new' | null>(null);

  if (!tariffs) {
    return (
      <Card>
        <SkeletonList rows={4} avatar={false} />
      </Card>
    );
  }

  const teacherCount = (tariffId: string) =>
    teachers?.filter((teacher) => teacher.tariffId === tariffId).length;

  return (
    <div className={styles.page}>
      {editing ? (
        <TariffForm
          key={editing === 'new' ? 'new' : editing.id}
          tariff={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className={styles.intro}>
          <p className={styles.introText}>
            <strong>
              Tarif ustozning oylik to'lovini, o'quvchilar sonini va ochiq bo'limlarni belgilaydi.
            </strong>
            Narx o'zgarsa, ustozlarga keyingi oylik yechimdan boshlab qo'llanadi.
          </p>
          <Button onClick={() => setEditing('new')}>+ Yangi tarif</Button>
        </div>
      )}

      {tariffs.length === 0 ? (
        <EmptyState icon="🏷️" title="Hali tarif yo'q" />
      ) : (
        <div className={styles.grid}>
          {tariffs.map((tariff) => (
            <TariffCard
              key={tariff.id}
              tariff={tariff}
              teacherCount={teacherCount(tariff.id)}
              actions={
                <Button size="sm" variant="outline" block onClick={() => setEditing(tariff)}>
                  Tahrirlash
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
