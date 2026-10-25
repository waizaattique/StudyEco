"use client";

import { useAuthUser } from "@/components/AuthUserProvider";
import { getDisplayName } from "@/lib/auth/display-name";

export default function DashboardHeader() {
  const user = useAuthUser();
  const name = getDisplayName(user);

  return (
    <header className="mb-10">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
        Dashboard
      </p>
      <h1 className="mt-3 break-words font-heading text-[40px] font-bold leading-tight text-ink sm:text-[48px] lg:text-[56px]">
        Hello, {name}.
      </h1>
      <p className="mt-3 max-w-prose text-[15px] font-normal leading-6 text-ink-soft">
        Your saved chats and a place to keep studying.
      </p>
    </header>
  );
}
