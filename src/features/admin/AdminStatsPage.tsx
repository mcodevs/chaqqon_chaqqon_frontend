import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { APPLICATION_STATUS_LABEL, applicationFunnel } from '@/domain/applications';
import { computePlatformStats, monthlyFinance } from '@/domain/platformStats';
import { formatCalendarDate, formatSom } from '@/shared/format';
import {
  useAdminLedger,
  useAdminTariffs,
  useAdminTeachers,
  useApplications,
  useSchoolToday,
} from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './Admin.module.css';
import { FilterPills } from './FilterPills';
import { FinanceChart } from './FinanceChart';
import { PERIOD_OPTIONS, type PeriodId, compactSom, rangeFor } from './periods';
import { StatTile } from './StatTile';
import { StatusChip } from './StatusChip';

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** The platform at a glance: money first, then teachers, students and how much they practise. */
export function AdminStatsPage() {
  const today = useSchoolToday();
  const [period, setPeriod] = useState<PeriodId>('thisMonth');
  const range = useMemo(() => rangeFor(period, today), [period, today]);
  const teachers = useAdminTeachers(range);
  const tariffs = useAdminTariffs();
  const ledger = useAdminLedger();
  const applications = useApplications();
  const funnel = useMemo(
    () => (applications ? applicationFunnel(applications, range) : undefined),
    [applications, range],
  );

  const stats = useMemo(
    () =>
      teachers && tariffs && ledger
        ? computePlatformStats(teachers, tariffs, ledger, range, today)
        : undefined,
    [teachers, tariffs, ledger, range, today],
  );
  const months = useMemo(() => (ledger ? monthlyFinance(ledger, 12, today) : []), [ledger, today]);

  if (!stats) {
    return (
      <Card>
        <SkeletonList rows={6} />
      </Card>
    );
  }

  const { finance } = stats;
  const revenueChange = finance.revenue - finance.previousRevenue;

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <FilterPills label="Davr" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <span className={styles.filterHint}>
          {formatCalendarDate(range.from)} – {formatCalendarDate(range.to)}
        </span>
      </div>

      <section aria-labelledby="money-title">
        <h2 id="money-title" className={styles.sectionTitle}>
          Moliya
        </h2>
        <div className={styles.tiles}>
          <StatTile
            label="Tushum"
            value={formatSom(finance.revenue)}
            detail={`Oldingi davrga nisbatan ${revenueChange >= 0 ? '+' : '−'}${compactSom(Math.abs(revenueChange))}`}
          />
          <StatTile label="Oylik kutilayotgan tushum (MRR)" value={formatSom(finance.mrr)} />
          <StatTile
            label="Jami qarz"
            value={formatSom(finance.debt)}
            tone={finance.debt > 0 ? 'negative' : undefined}
            detail={`${finance.debtors.length} ta ustoz qarzdor`}
          />
          <StatTile label="Oldindan to'langan" value={formatSom(finance.prepaid)} />
          <StatTile
            label="Hisoblangan oylik"
            value={formatSom(finance.charged)}
            detail="Davrda boshlangan oylar"
          />
          <StatTile
            label="Bonus va tuzatishlar"
            value={formatSom(finance.bonuses + finance.adjustments)}
            detail={`Bonus ${compactSom(finance.bonuses)} · tuzatish ${compactSom(finance.adjustments)}`}
          />
        </div>
      </section>

      <Card title="So'nggi 12 oy">
        <FinanceChart months={months} />
      </Card>

      <section aria-labelledby="platform-title">
        <h2 id="platform-title" className={styles.sectionTitle}>
          Platforma
        </h2>
        <div className={styles.tiles}>
          <StatTile
            label="Ustozlar"
            value={String(stats.teachers.total)}
            detail={`Davrda yangi: ${stats.teachers.newInRange}`}
          />
          <StatTile
            label="O'quvchilar"
            value={String(stats.students.total)}
            detail={`Davrda yangi: ${stats.students.newInRange}`}
          />
          <StatTile
            label="Oxirgi 7 kunda faol"
            value={`${stats.students.active}`}
            detail={`${percent(stats.students.active, stats.students.total)}% o'quvchi`}
          />
          <StatTile
            label="Obunasi ochiq o'quvchilar"
            value={`${stats.students.open}`}
            detail={`${percent(stats.students.open, stats.students.total)}% o'quvchi`}
          />
          <StatTile
            label="Mashqlar"
            value={String(stats.activity.practices)}
            detail={`Aniqlik ${stats.activity.accuracy}% · ${stats.activity.correct} to'g'ri javob`}
          />
          <StatTile label="Interaktiv uy vazifalari" value={String(stats.activity.homeworkRooms)} />
        </div>
      </section>

      {funnel && (
        <Card title="Arizalar">
          <div className={styles.tiles}>
            <StatTile
              label="Davrda kelgan"
              value={String(funnel.total)}
              detail={`Ustozga aylangan: ${funnel.conversion}%`}
            />
            {(['new', 'contacted', 'approved', 'rejected'] as const).map((status) => (
              <StatTile
                key={status}
                label={APPLICATION_STATUS_LABEL[status]}
                value={String(funnel.byStatus[status])}
              />
            ))}
          </div>
          {funnel.bySource.length > 0 && (
            <ul className={styles.shareList} aria-label="Qayerdan eshitgan">
              {funnel.bySource.map((row) => (
                <li key={row.source}>
                  <div className={styles.shareHead}>
                    <span>{row.source}</span>
                    <span className={styles.muted}>{row.count} ta</span>
                  </div>
                  <div className={styles.meter} aria-hidden="true">
                    <div
                      className={styles.meterFill}
                      style={{ width: `${percent(row.count, funnel.total)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className={styles.columns}>
        <Card title="Ustozlar holati">
          <ul className={styles.statusList}>
            {(Object.entries(stats.teachers.byStatus) as [keyof typeof stats.teachers.byStatus, number][])
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <li key={status}>
                  <StatusChip status={status} />
                  <strong>{count}</strong>
                </li>
              ))}
          </ul>
          {stats.teachers.total === 0 && <EmptyState>Hali ustoz qo'shilmagan.</EmptyState>}
        </Card>

        <Card title="Tariflar kesimi">
          {finance.byTariff.length === 0 ? (
            <EmptyState>Hali ustoz yo'q.</EmptyState>
          ) : (
            <ul className={styles.shareList}>
              {finance.byTariff.map((share) => (
                <li key={share.tariffId}>
                  <div className={styles.shareHead}>
                    <span>{share.name}</span>
                    <span className={styles.muted}>
                      {share.teachers} ustoz · {formatSom(share.mrr)}
                    </span>
                  </div>
                  <div className={styles.meter} aria-hidden="true">
                    <div
                      className={styles.meterFill}
                      style={{ width: `${percent(share.mrr, finance.mrr || 1)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Qarzdor ustozlar">
        {finance.debtors.length === 0 ? (
          <EmptyState icon="✓" title="Qarzdor yo'q">
            Hamma ustozning balansi musbat.
          </EmptyState>
        ) : (
          <ul className={styles.rows}>
            {finance.debtors.map((debtor) => (
              <li key={debtor.teacherId}>
                <Link to={`/admin/teachers/${debtor.teacherId}`} className={styles.rowLink}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{debtor.name}</span>
                    <span className={styles.rowMeta}>
                      {debtor.overdueSince ? `${formatCalendarDate(debtor.overdueSince)} dan beri` : ''}
                    </span>
                  </span>
                  <span className={styles.rowEnd}>
                    <span className={styles.negativeAmount}>{formatSom(debtor.balance)}</span>
                    <StatusChip status={debtor.status} />
                  </span>
                  <span className={styles.rowChevron} aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
