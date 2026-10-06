import { useState } from 'react';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { fullName } from '@/domain/users';
import { drillDetail } from '@/features/share/resultCard';
import { ShareResult } from '@/features/share/ShareResult';
import { useCurrentStudent } from '@/features/student/CurrentStudentContext';
import { useSchoolToday, useStudentRoom } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';
import { CompetitionRun } from './CompetitionRun';

export function StudentCompetitionPage() {
  const student = useCurrentStudent();
  const today = useSchoolToday();
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
  const done = progress[student.id];
  if (done?.finished && reviewingRoomId !== room.id) {
    // Coming back to a finished task: the picture is still here to send.
    return (
      <Card>
        <EmptyState icon="🎉" title="Vazifa yakunlandi!">
          Xatosiz bajarilgan har bir uy vazifasi uchun 1 ta yulduz beriladi.
        </EmptyState>
        <ShareResult
          title="Interaktiv uy vazifasi"
          name={fullName(student)}
          detail={drillDetail(room.configs[student.id] ?? DEFAULT_PRACTICE_CONFIG)}
          correct={done.correct}
          total={done.total}
          today={today}
        />
      </Card>
    );
  }

  return (
    <CompetitionRun
      key={room.id}
      room={room}
      student={student}
      onFinished={() => setReviewingRoomId(room.id)}
      onDismiss={() => setReviewingRoomId(null)}
    />
  );
}
