import { useRef, useState } from 'react';
import type { PracticeConfig } from '@/domain/practice/config';
import { generateProblems } from '@/domain/practice/problem';
import type { Student } from '@/domain/users';
import { useStudents } from '@/shared/services/queries';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { ClassroomMatch } from './ClassroomMatch';
import { ClassroomSetupForm } from './ClassroomSetupForm';
import type { ClassroomMatchSetup } from './types';

export function ClassroomPage() {
  const students = useStudents();
  const [match, setMatch] = useState<ClassroomMatchSetup | null>(null);
  const nextMatchId = useRef(0);

  const start = (config: PracticeConfig, participants: readonly Student[]) =>
    setMatch({
      id: ++nextMatchId.current,
      config,
      participants,
      problemSets: participants.map(() => generateProblems(config, Math.random)),
    });

  if (!students) return <LoadingScreen />;
  if (!match) return <ClassroomSetupForm students={students} onStart={start} />;

  return (
    <ClassroomMatch
      key={match.id}
      setup={match}
      onRematch={() => start(match.config, match.participants)}
      onClose={() => setMatch(null)}
    />
  );
}
