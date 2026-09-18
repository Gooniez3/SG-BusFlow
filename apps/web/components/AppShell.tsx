"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/PageHeader";
import { WorkspaceMap } from "@/components/WorkspaceMap";
import { WorkspaceProvider } from "@/lib/workspace";

const DESKTOP_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/nearby", label: "Nearby" },
  { href: "/favorites", label: "Favorites" },
];

const MOBILE_LINKS = [
  { href: "/", label: "Nearby", icon: NearbyIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/favorites", label: "Saved", icon: SavedIcon },
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
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white" aria-hidden>
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
  const mapPage = pathname === "/map";
  const [profileOpen, setProfileOpen] = useState(false);
  const nested =
    pathname.startsWith("/stops/") ||
    pathname.startsWith("/live/") ||
    pathname.startsWith("/services/");

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          {pathname === "/map" ? (
            <span className="md:hidden">
              <BackButton href="/" label="Back to nearby" />
            </span>
          ) : null}
          <span className={pathname === "/map" ? "hidden md:inline-flex" : ""}>
            <Wordmark />
          </span>
          {pathname === "/map" ? (
            <span className="text-[15px] font-semibold md:hidden">Map</span>
          ) : null}
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {DESKTOP_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={navActive(pathname, link.href) ? "text-[var(--accent)]" : "text-[var(--muted)]"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setProfileOpen((value) => !value)}
          className={`h-8 w-8 items-center justify-center rounded-full bg-[var(--card)] text-xs font-semibold text-[var(--muted)] ${
            nested || pathname === "/map" ? "hidden md:flex" : "flex"
          }`}
          aria-label="Account"
        >
          ◉
        </button>
      </header>
      {profileOpen ? (
        <div className="border-b border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
          Accounts come later. Favorites stay on this device.
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <main
          className={`min-h-0 overflow-y-auto ${
            mapPage
              ? "hidden md:block md:w-[400px] md:shrink-0 md:border-r md:border-[var(--line)]"
              : "w-full md:w-[400px] md:shrink-0 md:border-r md:border-[var(--line)]"
          }`}
        >
          <div className="px-3 py-3 pb-24 md:px-4 md:py-4 md:pb-8">{children}</div>
        </main>
        <section className={`relative min-h-0 flex-1 ${mapPage ? "flex" : "hidden md:flex"}`}>
          <WorkspaceMap />
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg)] md:hidden" aria-label="Primary">
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
                <Icon active={active} />
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
    <WorkspaceProvider>
      <ShellChrome>{children}</ShellChrome>
    </WorkspaceProvider>
  );
}

function NearbyIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" opacity={active ? 1 : 0.6} />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" opacity={active ? 1 : 0.7} />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5l5.5-2v13L4 20.5v-13zM9.5 5.5l5 2.5v13l-5-2.5v-13zM14.5 8l5.5-2.5v13L14.5 21V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.7}
      />
    </svg>
  );
}

function SavedIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} aria-hidden>
      <path
        d="M12 18l-6.2-5.4A3.8 3.8 0 0112 7.2a3.8 3.8 0 016.2 5.4L12 18z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
