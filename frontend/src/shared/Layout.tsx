import { NavLink, Outlet } from 'react-router-dom';
import { Role } from '@campaigncell/shared-types';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from './labels';

const NAV_BY_ROLE: Record<Role, { to: string; label: string }[]> = {
  [Role.SUBSCRIBER]: [{ to: '/subscriber/offers', label: 'Tekliflerim' }],
  [Role.PERSONEL]: [
    { to: '/expert/cases', label: 'Vakalarım' },
    { to: '/expert/campaigns/new', label: 'Yeni Kampanya' },
    { to: '/expert/profile', label: 'Profilim' },
  ],
  [Role.SUPERVISOR]: [
    { to: '/supervisor/dashboard', label: 'Dashboard' },
    { to: '/supervisor/queue', label: 'Bekleyen Kuyruk' },
    { to: '/cases-overview', label: 'Tüm Vakalar' },
  ],
  [Role.ADMIN]: [
    { to: '/admin/staff', label: 'Personel Yönetimi' },
    { to: '/cases-overview', label: 'Tüm Vakalar' },
    { to: '/admin/audit-log', label: 'Audit Log' },
  ],
};

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return <Outlet />;

  const links = NAV_BY_ROLE[user.role] ?? [];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">CampaignCell</div>
        <nav className="app-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <span>
            {user.firstName ?? user.email ?? user.gsm} · {ROLE_LABELS[user.role]}
          </span>
          <button className="btn btn-secondary" onClick={() => logout()}>
            Çıkış
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
