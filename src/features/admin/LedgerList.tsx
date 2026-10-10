import { schoolDate } from '@/domain/billing';
import type { LedgerEntry, Tariff } from '@/domain/teacherBilling';
import { formatCalendarDate, formatSom } from '@/shared/format';
import { EmptyState } from '@/shared/ui/Notice';
import styles from './Admin.module.css';
import { KIND_LABEL } from './ledgerText';

/** Ledger rows, newest first as given; charges are dated by the month they pay for. */
export function LedgerList({
  entries,
  tariffs,
  nameOf,
}: {
  entries: readonly LedgerEntry[];
  tariffs: readonly Tariff[];
  nameOf?: (teacherId: string) => string;
}) {
  if (entries.length === 0) return <EmptyState>Hali yozuv yo'q.</EmptyState>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Sana</th>
            {nameOf && <th scope="col">Ustoz</th>}
            <th scope="col">Turi</th>
            <th scope="col" className={styles.num}>
              Summa
            </th>
            <th scope="col">Izoh</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatCalendarDate(entry.periodStart ?? schoolDate(new Date(entry.createdAt)))}</td>
              {nameOf && <td>{nameOf(entry.teacherId)}</td>}
              <td>{KIND_LABEL[entry.kind]}</td>
              <td className={`${styles.num} ${entry.amount > 0 ? styles.positiveAmount : styles.amount}`}>
                {entry.amount > 0 ? '+' : ''}
                {formatSom(entry.amount)}
              </td>
              <td>
                {entry.kind === 'charge'
                  ? (tariffs.find((t) => t.id === entry.tariffId)?.name ?? entry.note)
                  : entry.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
