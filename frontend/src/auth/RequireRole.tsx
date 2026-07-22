import { Navigate, Outlet } from 'react-router-dom';
import { Role } from '@campaigncell/shared-types';
import { useAuth } from './AuthContext';

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;

  return <Outlet />;
}
