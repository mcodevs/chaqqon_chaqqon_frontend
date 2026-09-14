import type { Room, RoomProgress } from '@/domain/competition';
import type { Student } from '@/domain/users';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Competition.module.css';

interface RoomMonitorProps {
  room: Room;
  progress: Record<string, RoomProgress>;
  students: readonly Student[];
  error: string | null;
  onStart: () => void;
  onClose: () => void;
}

export function RoomMonitor({ room, progress, students, error, onStart, onClose }: RoomMonitorProps) {
  const isWaiting = room.status === 'waiting';

  return (
    <Card title={`Musobaqa xonasi ${isWaiting ? '(kutmoqda)' : '(boshlandi)'}`}>
      <ul className={styles.monitor}>
        {room.participantIds.map((id) => {
          const entry = progress[id];
          const name = students.find((s) => s.id === id)?.firstName ?? "O'chirilgan o'quvchi";
          return (
            <li key={id} className={styles.monitorRow}>
              <span className={styles.monitorName}>{name}</span>
              <span className={styles.monitorProgress}>
                {entry?.answered ?? 0}/{entry?.total ?? 0}
              </span>
              <span className={styles.monitorScore}>{entry?.correct ?? 0} to'g'ri</span>
              <span className={`${styles.monitorStatus} ${entry?.finished ? styles.done : ''}`}>
                {entry?.finished ? 'Tugatdi' : isWaiting ? 'Kutmoqda' : 'Ishlayapti'}
              </span>
            </li>
          );
        })}
      </ul>
      <ErrorMessage>{error}</ErrorMessage>
      <div className={styles.actions}>
        {isWaiting && (
          <Button tone="green" onClick={onStart}>
            Boshlash
          </Button>
        )}
        <Button tone="coral" onClick={onClose}>
          Xonani yopish
        </Button>
      </div>
    </Card>
  );
}
