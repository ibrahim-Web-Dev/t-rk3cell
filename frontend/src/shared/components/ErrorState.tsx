export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block state-error">
      <span>⚠ {message}</span>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Tekrar dene
        </button>
      )}
    </div>
  );
}
