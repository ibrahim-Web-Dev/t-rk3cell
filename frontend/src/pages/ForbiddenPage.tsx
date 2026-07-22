import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { homePathForRole } from '../homePathForRole';

export function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="fullpage-state">
      <ShieldAlert size={48} color="var(--color-danger)" />
      <div className="code">403</div>
      <h2 style={{ margin: 0 }}>Bu sayfaya erişim yetkiniz yok</h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: 420 }}>
        Hesabınızın rolü bu ekranı görüntülemek için yeterli değil. Yanlışlıkla buraya geldiyseniz ana sayfanıza dönebilirsiniz.
      </p>
      <Link className="btn btn-primary" to={user ? homePathForRole(user.role) : '/login'}>
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
