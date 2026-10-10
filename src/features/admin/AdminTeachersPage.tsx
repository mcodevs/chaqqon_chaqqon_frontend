import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Credentials } from '@/application/adminService';
import { addDays } from '@/domain/billing';
import { billingStateOf, teacherName } from '@/domain/platformStats';
import { CredentialsNotice } from '@/features/teacher/CredentialsNotice';
import { formatSom } from '@/shared/format';
import {
  useAdminLedger,
  useAdminTariffs,
  useAdminTeachers,
  usePlatformSettings,
  useSchoolToday,
} from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import { SearchField } from '@/shared/ui/SearchField';
import styles from './Admin.module.css';
import { NewTeacherForm } from './NewTeacherForm';
import { StatusChip } from './StatusChip';

/** Every teacher with their balance, status and class size; the way to a new teacher account. */
export function AdminTeachersPage() {
  const today = useSchoolToday();
  const range = useMemo(() => ({ from: addDays(today, -29), to: today }), [today]);
  const teachers = useAdminTeachers(range);
  const tariffs = useAdminTariffs();
  const ledger = useAdminLedger();
  const settings = usePlatformSettings();
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<Credentials | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!teachers || !tariffs || !ledger) return undefined;
    const needle = query.trim().toLowerCase();
    return teachers
      .filter((teacher) =>
        needle
          ? [teacherName(teacher), teacher.username, teacher.phone, teacher.centerName]
              .join(' ')
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .map((teacher) => ({
        teacher,
        tariff: tariffs.find((t) => t.id === teacher.tariffId),
        state: billingStateOf(teacher, tariffs, ledger, today),
      }));
  }, [teachers, tariffs, ledger, query, today]);

  return (
    <div className={styles.page}>
      {created && (
        <CredentialsNotice
          title="Ustozga kirish ma'lumotlarini bering"
          credentials={created}
          onDismiss={() => setCreated(null)}
        />
      )}

      {adding && tariffs && settings ? (
        <NewTeacherForm
          tariffs={tariffs}
          trialDays={settings.trialDays}
          onCreated={(_id, credentials) => {
            setAdding(false);
            setCreated(credentials);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className={styles.searchBar}>
          <SearchField
            className={styles.searchGrow}
            label="Ustozlarni qidirish"
            placeholder="Ism, login, telefon yoki markaz"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={() => setAdding(true)}>+ Yangi ustoz</Button>
        </div>
      )}

      <Card
        title={rows ? `Ustozlar (${rows.length})` : 'Ustozlar'}
        actions={rows && rows.length > 0 && <span className={styles.columnHint}>Balans va holat</span>}
      >
        {!rows ? (
          <SkeletonList rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon="👩‍🏫" title={query ? 'Topilmadi' : "Hali ustoz yo'q"}>
            {query
              ? "Boshqa so'z bilan qidirib ko'ring."
              : 'Arizadan keyin ustoz akkauntini shu yerda yarating.'}
          </EmptyState>
        ) : (
          <ul className={styles.rows}>
            {rows.map(({ teacher, tariff, state }) => (
              <li key={teacher.id}>
                <Link to={`/admin/teachers/${teacher.id}`} className={styles.rowLink}>
                  <span className={styles.rowAvatar} aria-hidden="true">
                    {teacherName(teacher).charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{teacherName(teacher)}</span>
                    <span className={styles.rowFacts}>
                      <span>@{teacher.username}</span>
                      {teacher.centerName && <span>{teacher.centerName}</span>}
                      {teacher.phone && <span>{teacher.phone}</span>}
                    </span>
                    <span className={styles.rowFacts}>
                      <span>{tariff?.name ?? '—'}</span>
                      <span>
                        {teacher.studentCount}
                        {tariff?.maxStudents ? ` / ${tariff.maxStudents}` : ''} o'quvchi
                      </span>
                      <span>30 kunda {teacher.practiceCount} mashq</span>
                    </span>
                  </span>
                  <span className={styles.rowEnd}>
                    <span className={state.balance < 0 ? styles.negativeAmount : styles.amount}>
                      {formatSom(state.balance)}
                    </span>
                    <StatusChip status={state.status} />
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
