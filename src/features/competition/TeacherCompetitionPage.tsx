import { useState } from 'react';
import { closedStudentIds } from '@/domain/billing';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useActiveRooms, usePayments, useSchoolToday, useStudents } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import styles from './Competition.module.css';
import { RoomMonitor } from './RoomMonitor';
import { RoomSetupForm } from './RoomSetupForm';

export function TeacherCompetitionPage() {
  const { competition } = useServices();
  const students = useStudents();
  const payments = usePayments();
  const today = useSchoolToday();
  const activeRooms = useActiveRooms();
  const [showSetup, setShowSetup] = useState(false);

  const openRoom = useAsyncAction(async (input: Parameters<typeof competition.open>[0]) => {
    await competition.open(input);
    setShowSetup(false);
  });
  const startRoom = useAsyncAction(competition.start);
  const closeRoom = useAsyncAction(competition.close);

  if (!students || !payments || !activeRooms) return <LoadingScreen />;

  const closedIds = closedStudentIds(students, payments, today);
  const busyIds = new Set(
    activeRooms.flatMap((snap) => (snap.room ? snap.room.participantIds : [])),
  );

  const isFormOpen = activeRooms.length === 0 || showSetup;

  return (
    <div className={styles.teacherRoomsList}>
      {activeRooms.length > 0 && !showSetup && (
        <div className={styles.teacherHeader}>
          <span className={styles.hint}>Faol interaktiv vazifalar: {activeRooms.length} ta</span>
          <Button tone="pink" onClick={() => setShowSetup(true)}>
            + Yangi vazifa xonasi ochish
          </Button>
        </div>
      )}

      {isFormOpen && (
        <RoomSetupForm
          students={students}
          closedIds={closedIds}
          busyIds={busyIds}
          pending={openRoom.pending}
          error={openRoom.error}
          onOpen={openRoom.run}
          onCancel={activeRooms.length > 0 ? () => setShowSetup(false) : undefined}
        />
      )}

      {activeRooms.map(({ room, progress }) => {
        if (!room) return null;
        return (
          <RoomMonitor
            key={room.id}
            room={room}
            progress={progress}
            students={students}
            error={startRoom.error ?? closeRoom.error}
            onStart={() => startRoom.run(room.id)}
            onClose={() => closeRoom.run(room.id)}
          />
        );
      })}
    </div>
  );
}

