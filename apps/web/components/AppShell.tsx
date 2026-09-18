"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, Map, MapPin, Search, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceMap } from "@/components/WorkspaceMap";
import { ThemeProvider } from "@/lib/theme";
import { WorkspaceProvider } from "@/lib/workspace";

const DESKTOP_LINKS = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/nearby", label: "Nearby", icon: MapPin },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

const MOBILE_LINKS = [
  { href: "/", label: "Nearby", icon: MapPin },
  { href: "/search", label: "Search", icon: Search },
  { href: "/map", label: "Map", icon: Map },
  { href: "/favorites", label: "Saved", icon: Heart },
];

function navActive(pathname: string, href: string) {
  if (href === "/" || href === "/nearby") {
    return pathname === "/" || pathname === "/nearby";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="SG BusFlow home">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--on-accent)]" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 11c3-6 9-6 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="5" r="1.4" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">SG BusFlow</span>
    </Link>
  );
}

function ShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="bf-app-header flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--card)] px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Wordmark />
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {DESKTOP_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 ${
                  navActive(pathname, link.href) ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] md:flex"
            aria-label="Account"
          >
            <UserCircle size={18} strokeWidth={2} />
          </button>
        </div>
      </header>
      {profileOpen ? (
        <div className="border-b border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
          Accounts come later. Favorites stay on this device.
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 max-md:pb-14">
        <main className="bf-shell-main min-h-0 w-full overflow-y-auto md:w-[400px] md:shrink-0 md:border-r md:border-[var(--line)] md:overflow-y-auto">
          <div className="bf-shell-main-inner px-3 pt-3 pb-6 md:px-4 md:py-4 md:pb-8">{children}</div>
        </main>
        <section className="bf-shell-map relative min-h-0 flex-1">
          <WorkspaceMap />
        </section>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {MOBILE_LINKS.map((link) => {
            const active = navActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  active ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  fill={link.label === "Saved" && active ? "currentColor" : "none"}
                />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <ShellChrome>{children}</ShellChrome>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}

