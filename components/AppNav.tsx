"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Share2,
  Sparkles,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useAuthUser } from "@/components/AuthUserProvider";
import { logoutAction } from "@/app/actions/auth";
import { clearChats } from "@/lib/chat-store";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/ai-tutor", label: "AI Tutor", icon: Sparkles },
  { href: "/exam-prep", label: "Exam Prep", icon: GraduationCap },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/sharing", label: "Sharing", icon: Share2 },
  { href: "/well-being", label: "Well-being", icon: HeartPulse },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/health", label: "Health", icon: Activity },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const isCurrentPage = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);
    try {
      clearChats(user.id);
      const result = await logoutAction();
      if (!result.ok) {
        setLogoutError(result.error);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("[auth/logout] Could not clear local chat history", error);
      setLogoutError("Local chat history could not be cleared. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const accountActions = (
    <div className="border-t border-line px-2 pt-3">
      <p className="truncate px-2 text-xs text-ink-soft" title={user.email ?? undefined}>
        {user.email ?? "Signed in"}
      </p>
      {logoutError && (
        <p className="px-2 pt-2 text-xs text-red-700" role="alert">
          {logoutError}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="mt-2 min-h-10 w-full rounded-md px-2 text-left font-mono text-sm text-ink-soft hover:bg-mist hover:text-ink disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona"
      >
        {loggingOut ? "Logging out..." : "Log out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="font-mono text-lg text-ink">
          {BRAND.name}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="app-nav-drawer"
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-md border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona"
        >
          <span
            className={`h-0.5 w-5 bg-ink motion-safe:transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-5 bg-ink motion-safe:transition-opacity ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-5 bg-ink motion-safe:transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/25"
            onClick={() => setOpen(false)}
          />
          <nav
            id="app-nav-drawer"
            aria-label="App navigation"
            className="absolute left-0 right-0 top-[69px] max-h-[calc(100dvh-69px)] overflow-y-auto border-b border-line bg-paper px-2 py-2 shadow-lg"
          >
            <ul className="flex flex-col">
              {links.map((link) => {
                const active = isCurrentPage(link.href);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 font-mono text-sm motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona ${
                        active ? "bg-mist text-ink" : "text-ink-soft hover:bg-mist hover:text-ink"
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:scale-110"
                      />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {accountActions}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav
        aria-label="App navigation"
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-56 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:px-4 lg:py-6"
      >
        <Link href="/dashboard" className="mb-8 px-2 font-mono text-lg text-ink">
          {BRAND.name}
        </Link>
        <ul className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active = isCurrentPage(link.href);
            const Icon = link.icon;
            return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 font-mono text-sm motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona ${
                  active
                    ? "bg-mist text-ink"
                    : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:scale-110"
                />
                {link.label}
              </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/"
          className="px-2 pt-4 text-xs text-ink-soft underline decoration-line underline-offset-4 hover:text-corona focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona"
        >
          Back to landing
        </Link>
        <div className="mt-auto">{accountActions}</div>
      </nav>
    </>
  );
}
