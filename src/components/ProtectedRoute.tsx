import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireEnrollment?: boolean;
  requireSubjects?: boolean;
  requireCMO?: boolean;
  requireCreator?: boolean;
  requireHeadOps?: boolean;
  blockHeadOps?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireEnrollment = false,
  requireSubjects = false,
  requireCMO = false,
  requireCreator = false,
  requireHeadOps = false,
  blockHeadOps = false,
}) => {
  const { user, isLoading, isAdmin, isCMO, isCreator, isHeadOps, enrollment, hasSelectedSubjects, pendingJoinRequest } = useAuth();
  const location = useLocation();

  // IMPORTANT: Never unmount protected pages for same-session loading (mobile camera/file picker can
  // cause transient auth refresh events). Only block rendering when we *don't yet know* the user.
  if (isLoading) {
    if (!user) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // If we already have a user, avoid redirects while loading. Keep SPA mounted.
    if (requireAdmin || requireEnrollment || requireSubjects || requireCMO || requireCreator || requireHeadOps) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // HEAD OF OPS EXCLUSIVE ROUTING
  // If user is Head of Ops and trying to access CMO dashboard, redirect to Head of Ops dashboard
  if (blockHeadOps && isHeadOps) {
    return <Navigate to="/headops/dashboard" replace />;
  }

  // Require Head of Ops role specifically
  if (requireHeadOps && !isHeadOps && !isAdmin) {
    return <Navigate to="/cmo/dashboard" replace />;
  }

  // CMO route - but Head of Ops should go to their exclusive dashboard
  if (requireCMO && !isCMO && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireCreator && !isCreator && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireEnrollment && !enrollment) {
    // Admins, CMOs, and Creators don't need student enrollment
    if (isAdmin) return <Navigate to="/admin" replace />;
    // Head of Ops goes to their exclusive dashboard
    if (isHeadOps) return <Navigate to="/headops/dashboard" replace />;
    if (isCMO) return <Navigate to="/cmo/dashboard" replace />;
    if (isCreator) return <Navigate to="/creator/dashboard" replace />;
    // Users with pending bank transfer go to awaiting-payment, not activate
    if (pendingJoinRequest) return <Navigate to="/awaiting-payment" replace />;
    return <Navigate to="/activate" replace />;
  }

  // Require subject selection for A/L students with enrollment
  // O/L students don't need subject selection
  const isALevel = enrollment?.grade?.startsWith('al_');
  if (requireSubjects && enrollment && isALevel && !isAdmin && !hasSelectedSubjects) {
    return <Navigate to="/select-subjects" replace />;
  }

  return <>{children}</>;
};
