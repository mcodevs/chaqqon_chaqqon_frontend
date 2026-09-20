import { useState } from 'react';
import { useCurrentStudent } from '@/features/student/CurrentStudentContext';
import { useStudentRoom } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import { CompetitionRun } from './CompetitionRun';

export function StudentCompetitionPage() {
  const student = useCurrentStudent();
  const snapshot = useStudentRoom(student.id);
  // Keeps the summary on screen after this student finishes, until they leave it.
  const [reviewingRoomId, setReviewingRoomId] = useState<string | null>(null);

  if (!snapshot) return <LoadingScreen />;

  const { room, progress } = snapshot;
  const message = (icon: string, title: string, text: string) => (
    <Card>
      <EmptyState icon={icon} title={title}>
        {text}
      </EmptyState>
    </Card>
  );

  if (!room || !room.participantIds.includes(student.id)) {
    return message(
      '📭',
      "Hozircha vazifa yo'q",
      "Ustoz interaktiv xona ochganda, vazifa shu yerda o'zi paydo bo'ladi.",
    );
  }
  if (room.status === 'waiting') {
    return message(
      '⏳',
      'Tayyor turing',
      'Ustoz boshlaganda vazifa avtomatik ishga tushadi — sahifadan chiqmang.',
    );
  }
  if (progress[student.id]?.finished && reviewingRoomId !== room.id) {
    return message(
      '🎉',
      'Vazifa yakunlandi!',
      "Har 40 ta to'g'ri ishlangan misol uchun 1 ta yulduz beriladi.",
    );
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
