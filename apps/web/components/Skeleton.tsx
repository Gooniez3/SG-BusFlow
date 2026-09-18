export function StopCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-[var(--card)] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 rounded bg-[var(--line)]" />
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-[var(--line)]" />
          <div className="mt-2 h-3 w-40 rounded bg-[var(--line)]" />
        </div>
        <div className="h-4 w-10 rounded bg-[var(--line)]" />
      </div>
    </div>
  );
}

export function ArrivalSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-4">
      <div className="flex justify-between">
        <div className="h-7 w-14 rounded bg-[var(--line)]" />
        <div className="h-7 w-16 rounded bg-[var(--line)]" />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-[var(--line)]" />
    </div>
  );
}
