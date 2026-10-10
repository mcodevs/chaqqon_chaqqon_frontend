import type { PracticeKind } from '@/domain/practice/config';
import { hasFeature } from '@/domain/teacherBilling';
import { useMyFeatures } from '@/shared/services/queries';

/** The drills a form may offer: the anzan always, the others when the tariff has extra drills. */
export function useDrillKinds(kinds: readonly PracticeKind[]): readonly PracticeKind[] {
  const features = useMyFeatures();
  return hasFeature(features, 'extra_drills') ? kinds : kinds.filter((kind) => kind === 'anzan');
}
