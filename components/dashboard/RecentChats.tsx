"use client";

import Link from "next/link";
import { Pin } from "lucide-react";
import { relativeTime, useSavedChats } from "@/components/dashboard/useSavedChats";

export default function RecentChats() {
  const { chats, error, now, ready } = useSavedChats();
  const recentChats = chats.slice(0, 5);

  return (
    <section aria-labelledby="recent-chats-title" className="border-t border-line pt-7">
      <h2 id="recent-chats-title" className="text-lg font-medium">
        Recent chats
      </h2>

      {!ready ? (
        <div aria-hidden="true" className="mt-4 min-h-[220px] border-y border-line" />
      ) : error ? (
        <p className="mt-4 border-y border-line py-4 text-sm leading-6 text-ink-soft" role="alert">
          {error}
        </p>
      ) : recentChats.length === 0 ? (
        <div className="mt-4 flex min-h-[220px] flex-col items-start justify-center gap-2 border-y border-line py-5">
          <p className="text-sm text-ink-soft">No saved chats yet.</p>
          <Link
            href="/ai-tutor"
            className="inline-flex min-h-11 items-center text-sm underline decoration-line underline-offset-4 hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Open the tutor
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {recentChats.map((chat) => (
            <li key={chat.id}>
              <Link
                href={`/ai-tutor?chat=${encodeURIComponent(chat.id)}`}
                className="flex min-h-11 min-w-0 items-center gap-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm">{chat.title}</span>
                  {chat.pinned && (
                    <>
                      <Pin aria-hidden="true" className="size-3.5 shrink-0 text-ink-soft" />
                      <span className="sr-only">Pinned</span>
                    </>
                  )}
                </span>
                <time
                  dateTime={new Date(chat.updatedAt).toISOString()}
                  className="shrink-0 font-mono text-[11px] text-ink-soft"
                >
                  {relativeTime(chat.updatedAt, now)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
