import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Role } from '@campaigncell/shared-types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RequireRole } from './auth/RequireRole';
import { ToastProvider } from './shared/ToastContext';
import { Layout } from './shared/Layout';
import { LoginPage } from './pages/LoginPage';
import { OffersPage } from './pages/subscriber/OffersPage';
import { CaseQueuePage } from './pages/expert/CaseQueuePage';
import { CaseDetailPage } from './pages/expert/CaseDetailPage';
import { NewCampaignPage } from './pages/expert/NewCampaignPage';
import { ProfilePage } from './pages/expert/ProfilePage';
import { DashboardPage } from './pages/supervisor/DashboardPage';
import { PendingQueuePage } from './pages/supervisor/PendingQueuePage';
import { StaffPage } from './pages/admin/StaffPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { AllCasesPage } from './pages/admin/AllCasesPage';
import { homePathForRole } from './homePathForRole';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(user.role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<RequireRole roles={[Role.SUBSCRIBER]} />}>
          <Route path="/subscriber/offers" element={<OffersPage />} />
        </Route>

        <Route element={<RequireRole roles={[Role.PERSONEL]} />}>
          <Route path="/expert/cases" element={<CaseQueuePage />} />
          <Route path="/expert/cases/:id" element={<CaseDetailPage />} />
          <Route path="/expert/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/expert/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<RequireRole roles={[Role.SUPERVISOR, Role.ADMIN]} />}>
          <Route path="/supervisor/dashboard" element={<DashboardPage />} />
          <Route path="/cases-overview" element={<AllCasesPage />} />
        </Route>
        <Route element={<RequireRole roles={[Role.SUPERVISOR]} />}>
          <Route path="/supervisor/queue" element={<PendingQueuePage />} />
        </Route>

        <Route element={<RequireRole roles={[Role.ADMIN]} />}>
          <Route path="/admin/staff" element={<StaffPage />} />
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
