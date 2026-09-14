import { useState } from 'react';
import { useCurrentStudent } from '@/features/student/CurrentStudentContext';
import { useRoomSnapshot } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import { CompetitionRun } from './CompetitionRun';

export function StudentCompetitionPage() {
  const student = useCurrentStudent();
  const snapshot = useRoomSnapshot();
  // Keeps the summary on screen after this student finishes, until they leave it.
  const [reviewingRoomId, setReviewingRoomId] = useState<string | null>(null);

  if (!snapshot) return <LoadingScreen />;

  const { room, progress } = snapshot;
  const message = (text: string) => (
    <Card>
      <EmptyState>{text}</EmptyState>
    </Card>
  );

  if (!room || !room.participantIds.includes(student.id)) {
    return message("Hozircha faol musobaqa yo'q. Ustoz xona ochganda shu yerda ko'rinadi.");
  }
  if (room.status === 'waiting') {
    return message("Musobaqa boshlanishini kuting — ustoz tayyor bo'lganda avtomatik boshlanadi.");
  }
  if (progress[student.id]?.finished && reviewingRoomId !== room.id) {
    return message("Siz musobaqani yakunladingiz! Natijangiz reytingda ko'rinadi.");
  }

  return (
    <CompetitionRun
      key={room.id}
      room={room}
      studentId={student.id}
      onFinished={() => setReviewingRoomId(room.id)}
      onDismiss={() => setReviewingRoomId(null)}
    />
  );
}
