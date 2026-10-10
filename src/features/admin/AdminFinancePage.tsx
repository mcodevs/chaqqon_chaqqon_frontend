import { useMemo, useState } from 'react';
import { type DateRange, filterLedger, ledgerCsv, teacherName } from '@/domain/platformStats';
import type { LedgerKind } from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';
import { useAdminLedger, useAdminTariffs, useAdminTeachers, useSchoolToday } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import styles from './Admin.module.css';
import { FilterPills } from './FilterPills';
import { LedgerList } from './LedgerList';
import { KIND_LABEL } from './ledgerText';
import { PERIOD_OPTIONS, type PeriodId, rangeFor } from './periods';
import { StatTile } from './StatTile';

type PeriodFilter = PeriodId | 'all';
type KindFilter = LedgerKind | 'all';

const PERIODS: readonly { value: PeriodFilter; label: string }[] = [
  ...PERIOD_OPTIONS,
  { value: 'all', label: 'Barchasi' },
];
const KINDS: readonly { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'payment', label: KIND_LABEL.payment },
  { value: 'charge', label: KIND_LABEL.charge },
  { value: 'bonus', label: KIND_LABEL.bonus },
  { value: 'adjustment', label: KIND_LABEL.adjustment },
];

/** Every payment and every fee, narrowed by period, teacher and kind, and downloadable. */
export function AdminFinancePage() {
  const today = useSchoolToday();
  const [period, setPeriod] = useState<PeriodFilter>('thisMonth');
  const [kind, setKind] = useState<KindFilter>('all');
  const [teacherId, setTeacherId] = useState('');
  const range: DateRange | undefined = useMemo(
    () => (period === 'all' ? undefined : rangeFor(period, today)),
    [period, today],
  );
  const everyone = useMemo(() => ({ from: '2000-01-01', to: today }), [today]);
  const teachers = useAdminTeachers(everyone);
  const tariffs = useAdminTariffs();
  const ledger = useAdminLedger();

  const rows = useMemo(
    () =>
      ledger
        ? filterLedger(ledger, { range, teacherId: teacherId || null, kind: kind === 'all' ? null : kind })
        : undefined,
    [ledger, range, teacherId, kind],
  );

  if (!rows || !teachers || !tariffs) {
    return (
      <Card>
        <SkeletonList rows={6} />
      </Card>
    );
  }

  const nameOf = (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    return teacher ? teacherName(teacher) : '—';
  };
  const totalOf = (wanted: LedgerKind) =>
    rows.filter((row) => row.kind === wanted).reduce((sum, row) => sum + row.amount, 0);

  const download = () => {
    const blob = new Blob([`﻿${ledgerCsv(rows, nameOf)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chaqqon-moliya-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <FilterPills label="Davr" options={PERIODS} value={period} onChange={setPeriod} />
      </div>
      <div className={styles.filters}>
        <FilterPills label="Turi" options={KINDS} value={kind} onChange={setKind} />
        <select
          className={styles.select}
          style={{ maxWidth: 280 }}
          aria-label="Ustoz"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
        >
          <option value="">Barcha ustozlar</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacherName(teacher)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tiles}>
        <StatTile label="Tushgan pul" value={formatSom(totalOf('payment'))} />
        <StatTile label="Yechilgan oylik" value={formatSom(-totalOf('charge'))} />
        <StatTile label="Bonuslar" value={formatSom(totalOf('bonus'))} />
        <StatTile label="Tuzatishlar" value={formatSom(totalOf('adjustment'))} />
      </div>

      <Card
        title={`Jurnal (${rows.length})`}
        actions={
          <Button size="sm" variant="ghost" disabled={rows.length === 0} onClick={download}>
            ⬇ CSV
          </Button>
        }
      >
        <LedgerList entries={rows} tariffs={tariffs} nameOf={nameOf} />
      </Card>
    </div>
  );
}
