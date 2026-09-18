export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-6">
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}
