"use client";

import { FormEvent } from "react";

export function SearchField({
  name = "q",
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  name?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get(name) ?? "").trim();
    onSubmit?.(next);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={name}>
        {placeholder}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 text-[15px] outline-none focus:border-[var(--accent)]"
      />
    </form>
  );
}
