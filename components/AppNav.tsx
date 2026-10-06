"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/brand";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notes", label: "Notes" },
  { href: "/ai-tutor", label: "AI Tutor" },
  { href: "/exam-prep", label: "Exam Prep" },
  { href: "/timetable", label: "Timetable" },
  { href: "/reminders", label: "Reminders" },
  { href: "/sharing", label: "Sharing" },
  { href: "/well-being", label: "Well-being" },
  { href: "/settings", label: "Settings" },
  { href: "/health", label: "Health" },
];

export default function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md border border-line"
        >
          <span
            className={`h-0.5 w-5 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-5 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          id="app-nav-drawer"
          aria-label="App navigation"
          className="border-b border-line px-2 py-2 lg:hidden"
        >
          <ul className="flex flex-col">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2 font-mono text-sm ${
                      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-mist"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
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
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-md px-3 py-2 font-mono text-sm transition-colors ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-soft hover:bg-mist hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/"
          className="px-2 pt-4 text-xs text-ink-soft underline decoration-line underline-offset-4 hover:text-corona"
        >
          Back to landing
        </Link>
      </nav>
    </>
  );
}
