import { closedStudentIds } from '@/domain/billing';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { usePayments, useRoomSnapshot, useSchoolToday, useStudents } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { RoomMonitor } from './RoomMonitor';
import { RoomSetupForm } from './RoomSetupForm';

export function TeacherCompetitionPage() {
  const { competition } = useServices();
  const students = useStudents();
  const payments = usePayments();
  const today = useSchoolToday();
  const snapshot = useRoomSnapshot();
  const openRoom = useAsyncAction(competition.open);
  const startRoom = useAsyncAction(competition.start);
  const closeRoom = useAsyncAction(competition.close);

  if (!students || !payments || !snapshot) return <LoadingScreen />;

  if (!snapshot.room) {
    return (
      <RoomSetupForm
        students={students}
        closedIds={closedStudentIds(students, payments, today)}
        pending={openRoom.pending}
        error={openRoom.error}
        onOpen={openRoom.run}
      />
    );
  }

  const room = snapshot.room;
  return (
    <RoomMonitor
      room={room}
      progress={snapshot.progress}
      students={students}
      error={startRoom.error ?? closeRoom.error}
      onStart={() => startRoom.run(room.id)}
      onClose={() => closeRoom.run(room.id)}
    />
  );
}
