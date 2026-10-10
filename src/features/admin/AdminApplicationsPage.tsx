import { useMemo, useState } from 'react';
import type { Credentials } from '@/application/adminService';
import {
  APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
  type TeacherApplication,
  telegramLink,
} from '@/domain/applications';
import { schoolDate } from '@/domain/billing';
import { CredentialsNotice } from '@/features/teacher/CredentialsNotice';
import { formatCalendarDate } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { useAdminTariffs, useApplications } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { MenuButton } from '@/shared/ui/MenuButton';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import styles from './Admin.module.css';
import { NewTeacherForm } from './NewTeacherForm';

type Filter = ApplicationStatus | 'all';

const STATUS_TONE: Record<ApplicationStatus, 'warning' | 'neutral' | 'success' | 'danger'> = {
  new: 'warning',
  contacted: 'neutral',
  approved: 'success',
  rejected: 'danger',
};

/** "Dilnoza Karimova" → first and last name for the new account. */
function splitName(fullName: string) {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

/** Applications from the landing page: call the teacher, then open their account from here. */
export function AdminApplicationsPage() {
  const applications = useApplications();
  const tariffs = useAdminTariffs();
  const { applications: service } = useServices();
  const setStatus = useAsyncAction(service.setStatus);
  const [filter, setFilter] = useState<Filter>('new');
  const [creatingFrom, setCreatingFrom] = useState<TeacherApplication | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: 0, new: 0, contacted: 0, approved: 0, rejected: 0 };
    for (const application of applications ?? []) {
      result.all += 1;
      result[application.status] += 1;
    }
    return result;
  }, [applications]);

  if (!applications || !tariffs) {
    return (
      <Card>
        <SkeletonList rows={4} />
      </Card>
    );
  }

  const shown = applications.filter((a) => filter === 'all' || a.status === filter);
  const options = (['new', 'contacted', 'approved', 'rejected', 'all'] as const).map((value) => ({
    value,
    label: `${value === 'all' ? 'Hammasi' : APPLICATION_STATUS_LABEL[value]} (${counts[value]})`,
  }));

  return (
    <div className={styles.page}>
      {credentials && (
        <CredentialsNotice
          title="Ustozga kirish ma'lumotlarini bering"
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
        />
      )}

      {creatingFrom && (
        <NewTeacherForm
          tariffs={tariffs}
          prefill={{
            ...splitName(creatingFrom.fullName),
            phone: creatingFrom.phone,
            centerName: creatingFrom.centerName,
            tariffId: creatingFrom.tariffId,
          }}
          onCreated={async (teacherId, created) => {
            setCredentials(created);
            setCreatingFrom(null);
            await setStatus.run(creatingFrom.id, 'approved', teacherId);
          }}
          onCancel={() => setCreatingFrom(null)}
        />
      )}

      <div className={styles.filters}>
        <SegmentedControl
          label="Holat"
          appearance="pill"
          options={options}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <ErrorMessage>{setStatus.error}</ErrorMessage>

      {shown.length === 0 ? (
        <EmptyState icon="📭" title="Ariza yo'q">
          Landing sahifadan kelgan arizalar shu yerda ko'rinadi.
        </EmptyState>
      ) : (
        <div className={styles.tariffGrid}>
          {shown.map((application) => {
            const tariff = tariffs.find((t) => t.id === application.tariffId);
            const chat = telegramLink(application.telegramUsername);
            return (
              <article key={application.id} className={styles.tariffCard}>
                <div className={styles.headerRow}>
                  <h3 className={styles.tariffName}>{application.fullName}</h3>
                  <span className={`${styles.chip} ${styles[`chip_${STATUS_TONE[application.status]}`]}`}>
                    {APPLICATION_STATUS_LABEL[application.status]}
                  </span>
                </div>
                <span className={styles.rowFacts}>
                  <a href={`tel:${application.phone.replace(/[^+0-9]/g, '')}`}>{application.phone}</a>
                  {chat ? (
                    <a href={chat} target="_blank" rel="noreferrer">
                      {application.telegramUsername}
                    </a>
                  ) : (
                    application.telegramUsername && <span>{application.telegramUsername}</span>
                  )}
                </span>
                <span className={styles.rowFacts}>
                  {application.studentsCount !== null && <span>{application.studentsCount} o'quvchi</span>}
                  {application.city && <span>{application.city}</span>}
                  {application.centerName && <span>{application.centerName}</span>}
                  {tariff && <span>Tarif: {tariff.name}</span>}
                  {application.heardFrom && <span>Manba: {application.heardFrom}</span>}
                </span>
                {application.note && <p className={styles.hint}>“{application.note}”</p>}
                <span className={styles.tileDetail}>
                  {formatCalendarDate(schoolDate(new Date(application.createdAt)))}
                </span>
                {application.status !== 'approved' && (
                  <div className={styles.formActions}>
                    <Button size="sm" variant="secondary" onClick={() => setCreatingFrom(application)}>
                      Ustoz yaratish
                    </Button>
                    {application.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setStatus.pending}
                        onClick={() => void setStatus.run(application.id, 'contacted')}
                      >
                        Bog'lanildi
                      </Button>
                    )}
                    <MenuButton
                      actions={
                        application.status === 'rejected'
                          ? [
                              {
                                label: 'Qayta ochish',
                                onSelect: () => void setStatus.run(application.id, 'new'),
                              },
                            ]
                          : [
                              {
                                label: 'Rad etish',
                                danger: true,
                                onSelect: () => void setStatus.run(application.id, 'rejected'),
                              },
                            ]
                      }
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
