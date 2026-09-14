import type { PracticeConfig } from '@/domain/practice/config';
import type { Problem } from '@/domain/practice/problem';
import type { Student } from '@/domain/users';

export interface ClassroomMatchSetup {
  id: number;
  config: PracticeConfig;
  /** Panel order follows this list. */
  participants: readonly Student[];
  /** One problem list per participant: same settings, different numbers. */
  problemSets: readonly (readonly Problem[])[];
}
