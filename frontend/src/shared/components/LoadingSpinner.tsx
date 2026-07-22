export function LoadingSpinner({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="state-block state-loading">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
