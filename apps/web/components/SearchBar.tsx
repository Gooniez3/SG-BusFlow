"use client";

import { FormEvent } from "react";

export function SearchBar({
  name = "q",
  value,
  placeholder,
  autoFocus,
  onChange,
  onSubmit,
  onClear,
}: {
  name?: string;
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit?.(String(form.get(name) ?? "").trim());
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <label className="sr-only" htmlFor={name}>
        {placeholder}
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--muted)]" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id={name}
        name={name}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] py-3 pl-10 pr-10 text-[15px]"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-sm text-[var(--muted)]"
          aria-label="Clear search"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
