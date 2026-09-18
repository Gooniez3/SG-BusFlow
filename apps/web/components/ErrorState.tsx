export function ErrorState({
  title,
  detail,
  lastUpdated,
  onRetry,
}: {
  title: string;
  detail?: string;
  lastUpdated?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p> : null}
      {lastUpdated ? <p className="mt-2 text-xs text-[var(--muted)]">Last updated {lastUpdated}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-[var(--on-accent)]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
