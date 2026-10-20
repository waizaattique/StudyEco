"use client";

import { useAuthUser } from "@/components/AuthUserProvider";

export default function DashboardHeader() {
  const user = useAuthUser();
  const name = user.email ? user.email.split("@")[0] || "there" : "there";

  return (
    <header className="mb-10">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
        Dashboard
      </p>
      <h1 className="mt-3 break-words font-heading text-4xl leading-tight sm:text-5xl">
        Hello, {name}.
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-ink-soft">
        Your saved chats and a place to keep studying.
      </p>
    </header>
  );
}
