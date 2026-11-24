"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ITEMS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/plan", label: "Plan", icon: CalendarIcon },
  // Blocks is top-level rather than buried under Plan → "Browse all". It's
  // the catalogue you browse to decide what to train toward, which is a
  // different job from managing the week you're already in.
  { href: "/plans", label: "Blocks", icon: StackIcon },
  { href: "/history", label: "History", icon: ChartIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on the onboarding flow — a full-screen wizard shouldn't have a
  // "jump to Profile" trap door distracting from the one task at hand.
  if (pathname.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-xl border-t border-border-strong/40 safe-bottom z-40">
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/plan"
                // Guard the prefix: "/plans" starts with "/plan", so a bare
                // startsWith would light both tabs at once.
                ? pathname === "/plan"
                : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors",
                active ? "text-text" : "text-text-dim hover:text-text-muted"
              )}
            >
              <Icon className="w-[22px] h-[22px]" active={active} />
              <span
                className={clsx(
                  "font-medium tracking-wide",
                  active && "text-text"
                )}
              >
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute top-1 w-1 h-1 rounded-full bg-accent"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12L12 3l9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
    </svg>
  );
}

function ChartIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-7" />
    </svg>
  );
}

function CalendarIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3m8-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  );
}

function StackIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function UserIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
