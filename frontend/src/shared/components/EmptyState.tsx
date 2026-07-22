export function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-block state-empty">
      <span>{message}</span>
    </div>
  );
}
