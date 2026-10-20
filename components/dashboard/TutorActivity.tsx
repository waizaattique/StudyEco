"use client";

import { relativeTime, useSavedChats } from "@/components/dashboard/useSavedChats";

export default function TutorActivity() {
  const { chats, error, now, ready } = useSavedChats();
  const lastUsed = chats[0];

  return (
    <section aria-labelledby="tutor-activity-title">
      <h2 id="tutor-activity-title" className="text-base font-medium">
        Tutor activity
      </h2>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        <div className="flex min-h-11 items-center justify-between gap-4 py-2">
          <dt className="text-sm text-ink-soft">Saved chats</dt>
          <dd className="font-mono text-xs">
            {!ready ? "—" : error ? "Unavailable" : chats.length}
          </dd>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4 py-2">
          <dt className="text-sm text-ink-soft">Last used</dt>
          <dd className="text-right font-mono text-[11px] text-ink-soft">
            {!ready ? "—" : error ? "Unavailable" : lastUsed ? relativeTime(lastUsed.updatedAt, now) : "Not used yet"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
