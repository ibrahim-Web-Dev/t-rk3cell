import { FormEvent, useEffect, useState } from 'react';
import { Role, SegmentType } from '@campaigncell/shared-types';
import { createStaff, listStaff, updateStaffRole } from '../../api/usersApi';
import { apiErrorMessage } from '../../api/client';
import { AuthUser } from '../../auth/authStore';
import { EXPERT_SPECIALTY_LABELS, ROLE_LABELS } from '../../shared/labels';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorState } from '../../shared/components/ErrorState';

const REGIONS = ['MARMARA', 'EGE', 'IC_ANADOLU', 'AKDENIZ', 'KARADENIZ', 'DOGU_ANADOLU', 'GUNEYDOGU_ANADOLU'];

export function StaffPage() {
  const [staff, setStaff] = useState<AuthUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>(Role.PERSONEL);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError(null);
    listStaff()
      .then(setStaff)
      .catch((err) => setError(apiErrorMessage(err, 'Personel listesi yüklenemedi')));
  }

  useEffect(load, []);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    try {
      await updateStaffRole(userId, newRole);
      show('success', 'Rol güncellendi');
      load();
    } catch (err) {
      show('error', apiErrorMessage(err, 'Rol güncellenemedi'));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStaff({ email, password, firstName, lastName, role, specialties, regions });
      show('success', 'Personel hesabı oluşturuldu');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setSpecialties([]);
      setRegions([]);
      load();
    } catch (err) {
      show('error', apiErrorMessage(err, 'Personel oluşturulamadı'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>Personel Hesabı Oluştur</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Şifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Ad</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Soyad</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value={Role.PERSONEL}>{ROLE_LABELS.PERSONEL}</option>
              <option value={Role.SUPERVISOR}>{ROLE_LABELS.SUPERVISOR}</option>
              <option value={Role.ADMIN}>{ROLE_LABELS.ADMIN}</option>
            </select>
          </div>
          <div className="form-field">
            <label>Uzmanlaştığı Vaka Türleri</label>
            <p style={{ margin: '-2px 0 8px', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 400 }}>
              Bu, personelin kişisel özelliği değil — hangi <strong>abone segmenti</strong> türündeki optimizasyon
              vakalarına atanacağını belirler (AI'ın otomatik uzman atama formülünde kullanılır).
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.values(SegmentType).map((s) => (
                <label key={s} style={{ fontWeight: 400, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={specialties.includes(s)}
                    onChange={() => toggle(specialties, s, setSpecialties)}
                  />
                  {EXPERT_SPECIALTY_LABELS[s]}
                </label>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>Bölgeler</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGIONS.map((r) => (
                <label key={r} style={{ fontWeight: 400, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" checked={regions.includes(r)} onChange={() => toggle(regions, r, setRegions)} />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            Oluştur
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Personel Listesi</h2>
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !staff && <LoadingSpinner />}
        {!error && staff && (
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Baktığı Vaka Türleri</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.firstName} {s.lastName}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{s.email}</div>
                  </td>
                  <td>
                    <select
                      value={s.role}
                      onChange={(e) => handleRoleChange(s.id, e.target.value as Role)}
                      disabled={s.id === currentUserId}
                      title={s.id === currentUserId ? 'Kendi rolünüzü değiştiremezsiniz' : 'Rolü değiştir'}
                      style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    >
                      <option value={Role.PERSONEL}>{ROLE_LABELS.PERSONEL}</option>
                      <option value={Role.SUPERVISOR}>{ROLE_LABELS.SUPERVISOR}</option>
                      <option value={Role.ADMIN}>{ROLE_LABELS.ADMIN}</option>
                    </select>
                  </td>
                  <td>{s.specialties.map((sp) => EXPERT_SPECIALTY_LABELS[sp] ?? sp).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
