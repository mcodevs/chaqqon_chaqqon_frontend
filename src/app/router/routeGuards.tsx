import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/application/session';
import { type Feature, FEATURE_META, hasFeature } from '@/domain/teacherBilling';
import { useMyFeatures } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { homePath, useSession } from '@/shared/session/SessionContext';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { EmptyState } from '@/shared/ui/Notice';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession();
  if (session?.role !== role) return <Navigate to={homePath(session)} replace />;
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useSession();
  if (session) return <Navigate to={homePath(session)} replace />;
  return children;
}

/**
 * The site's root: the landing page for a guest in a browser. Signed-in users go to their panel,
 * and inside the Telegram Mini App (where students and teachers open the app) straight to sign-in.
 */
export function LandingOrHome({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { telegram } = useServices();
  if (session) return <Navigate to={homePath(session)} replace />;
  if (telegram.isAvailable()) return <Navigate to="/login" replace />;
  return children;
}

export function HomeRedirect() {
  const { session } = useSession();
  return <Navigate to={homePath(session)} replace />;
}

/** A section that only some tariffs open. Followed from an old link, it explains instead of failing. */
export function RequireFeature({ feature, children }: { feature: Feature; children: ReactNode }) {
  const features = useMyFeatures();
  if (!features) return <SkeletonList rows={3} />;
  if (!hasFeature(features, feature)) {
    return (
      <EmptyState icon="🔒" title={`${FEATURE_META[feature].label} tarifga kirmaydi`}>
        Bu bo'lim ustozning tarifiga qo'shilganda ochiladi.
      </EmptyState>
    );
  }
  return children;
}
