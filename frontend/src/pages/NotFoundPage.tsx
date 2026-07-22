import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../homePathForRole';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="fullpage-state">
      <Compass size={48} color="var(--color-brand-blue-500)" />
      <div className="code">404</div>
      <h2 style={{ margin: 0 }}>Sayfa bulunamadı</h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: 420 }}>Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link className="btn btn-primary" to={user ? homePathForRole(user.role) : '/login'}>
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
