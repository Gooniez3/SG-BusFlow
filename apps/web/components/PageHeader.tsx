"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function BackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-[var(--ink)] shadow-[0_2px_10px_rgb(0_0_0_/_0.28)]"
      aria-label={label}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export function PageHeader({
  href,
  label,
  title,
  extra,
}: {
  href: string;
  label: string;
  title: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <BackButton href={href} label={label} />
      <div className="min-w-0 flex-1">{title}</div>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  );
}
