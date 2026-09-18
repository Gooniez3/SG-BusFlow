"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)]"
      aria-label={label}
    >
      <ArrowLeft size={18} strokeWidth={2} />
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
    <div data-page-header className="flex items-start gap-3 pr-14 md:pr-0">
      <BackButton href={href} label={label} />
      <div className="min-w-0 flex-1">{title}</div>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  );
}
