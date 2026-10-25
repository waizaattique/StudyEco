"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredChat } from "@/lib/chat-store";
import { groupChatsByCalendarDate } from "@/lib/chat-date";

const subscribeToHydration = () => () => {};

interface HistoryPanelProps {
  chats: StoredChat[];
  activeChatId: string | null;
  collapsed: boolean;
  focusSearchToken: number;
  onExpand: () => void;
  onNewChat: () => void;
  onSelectChat: (chat: StoredChat) => void;
  onTogglePin: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chatId: string) => void;
}

export default function HistoryPanel({
  chats,
  activeChatId,
  collapsed,
  focusSearchToken,
  onExpand,
  onNewChat,
  onSelectChat,
  onTogglePin,
  onRename,
  onDelete,
}: HistoryPanelProps) {
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (focusSearchToken > 0) searchInputRef.current?.focus();
  }, [focusSearchToken]);

  const normalizedQuery = query.trim().toLowerCase();
  const pinnedChats = chats.filter((chat) => chat.pinned);
  const recentChats = chats.filter(
    (chat) =>
      !chat.pinned && chat.title.toLowerCase().includes(normalizedQuery),
  );

  const groupedRecents =
    !hasMounted || normalizedQuery
      ? []
      : groupChatsByCalendarDate(recentChats);

  function beginRename(chat: StoredChat) {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
    setMenuChatId(null);
  }

  function submitRename(chatId: string) {
    const title = renameValue.trim();
    if (title) onRename(chatId, title);
    setRenamingId(null);
  }

  function renderChatRow(chat: StoredChat) {
    const isRenaming = renamingId === chat.id;
    const menuOpen = menuChatId === chat.id;
    return (
      <div
        key={chat.id}
        className={`group relative flex min-w-0 items-center rounded-lg ${
          activeChatId === chat.id ? "bg-mist text-ink" : "text-ink-soft"
        }`}
      >
        {isRenaming ? (
          <form
            className="min-w-0 flex-1 px-2 py-1"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename(chat.id);
            }}
          >
            <label className="sr-only" htmlFor={`rename-chat-${chat.id}`}>
              Rename chat
            </label>
            <input
              id={`rename-chat-${chat.id}`}
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setRenamingId(null);
              }}
              className="h-10 w-full rounded-md border border-ink bg-paper px-2 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
            />
          </form>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              aria-current={activeChatId === chat.id ? "page" : undefined}
              onClick={() => onSelectChat(chat)}
              className="icon-hover-target group h-11 min-w-0 flex-1 justify-start gap-2 overflow-hidden px-2 text-left text-xs hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink"
            >
              <MessageCircle aria-hidden="true" className="icon-chat size-4 shrink-0" />
              <span className="truncate">{chat.title}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`Actions for ${chat.title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuChatId(menuOpen ? null : chat.id)}
              className="mr-1 size-11 shrink-0 focus-visible:ring-2 focus-visible:ring-ink"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                aria-label={`Actions for ${chat.title}`}
                className="absolute right-1 top-10 z-20 w-40 rounded-lg border border-line bg-paper p-1 shadow-lg"
              >
                <MenuAction
                  icon={
                    chat.pinned ? (
                      <PinOff aria-hidden="true" className="icon-drop" />
                    ) : (
                      <Pin aria-hidden="true" className="icon-drop" />
                    )
                  }
                  onClick={() => {
                    onTogglePin(chat.id);
                    setMenuChatId(null);
                  }}
                >
                  {chat.pinned ? "Unpin" : "Pin"}
                </MenuAction>
                <MenuAction
                  icon={<WritingIcon />}
                  onClick={() => beginRename(chat)}
                >
                  Rename
                </MenuAction>
                <MenuAction
                  icon={<Trash2 aria-hidden="true" className="icon-bin-lid" />}
                  onClick={() => {
                    setMenuChatId(null);
                    if (window.confirm("Delete this conversation?")) {
                      onDelete(chat.id);
                    }
                  }}
                >
                  Delete
                </MenuAction>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-2">
        <RailButton label="New chat" onClick={onNewChat}>
          <WritingIcon />
        </RailButton>
        <RailButton
          label="Search recent chats"
          onClick={() => {
            onExpand();
            setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
        >
          <Search aria-hidden="true" className="icon-scan" />
        </RailButton>
        {chats.map((chat) => (
          <RailButton
            key={chat.id}
            label={chat.title}
            onClick={() => onSelectChat(chat)}
            current={activeChatId === chat.id}
          >
            <MessageCircle aria-hidden="true" className="icon-chat" />
          </RailButton>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onNewChat}
          className="icon-hover-target group h-11 w-full justify-start gap-2 px-2 text-left hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink"
        >
          <WritingIcon />
          <span>New chat</span>
        </Button>
        <label className="group relative mt-2 block">
          <span className="sr-only">Search recent chats</span>
          <Search
            aria-hidden="true"
            className="icon-scan pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recent chats"
            className="h-11 w-full rounded-md border border-line bg-paper pl-9 pr-3 text-sm outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={pinnedOpen}
            className="icon-hover-target group h-11 w-full justify-start gap-2 px-2 text-left hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink"
            onClick={() => setPinnedOpen((open) => !open)}
          >
            <Pin aria-hidden="true" className="icon-drop" />
            <span className="flex-1">Pinned</span>
            <ChevronRight
              aria-hidden="true"
              className={`icon-chevron size-4 ${
                pinnedOpen ? "icon-chevron-open" : ""
              }`}
            />
          </Button>
          {pinnedOpen && (
            <div className="mt-1 space-y-1">
              {pinnedChats.map(renderChatRow)}
              {pinnedChats.length === 0 && (
                <p className="px-3 py-2 text-xs text-ink-soft">
                  No pinned chats.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          {normalizedQuery ? (
            <div>
              <p className="px-3 pb-1 font-mono text-xs uppercase tracking-wider text-ink-soft">
                Recents
              </p>
              <div className="space-y-1">
                {recentChats.map(renderChatRow)}
                {recentChats.length === 0 && (
                  <p className="px-3 py-2 text-xs text-ink-soft">
                    No matching chats.
                  </p>
                )}
              </div>
            </div>
          ) : !hasMounted ? (
            <div>
              <p className="px-3 pb-1 font-mono text-xs uppercase tracking-wider text-ink-soft">
                Recents
              </p>
              <div className="space-y-1">
                {recentChats.map(renderChatRow)}
                {recentChats.length === 0 && (
                  <p className="px-3 py-2 text-xs text-ink-soft">
                    {chats.length === 0 ? "No chats yet." : "No recent chats."}
                  </p>
                )}
              </div>
            </div>
          ) : groupedRecents.length === 0 ? (
            <div>
              <p className="px-3 pb-1 font-mono text-xs uppercase tracking-wider text-ink-soft">
                Recents
              </p>
              <p className="px-3 py-2 text-xs text-ink-soft">
                {chats.length === 0 ? "No chats yet." : "No recent chats."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedRecents.map((group) => (
                <div key={group.key}>
                  <p className="px-3 pb-1 font-mono text-xs uppercase tracking-wider text-ink-soft">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(renderChatRow)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RailButton({
  children,
  label,
  onClick,
  current = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  current?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      title={label}
      onClick={onClick}
      className={`icon-hover-target group size-11 focus-visible:ring-2 focus-visible:ring-ink ${
        current ? "bg-mist text-ink" : ""
      }`}
    >
      {children}
    </Button>
  );
}

function WritingIcon() {
  return (
    <span className="relative inline-flex size-4 shrink-0">
      <SquarePen aria-hidden="true" className="icon-write size-4" />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute inset-0 size-4 overflow-visible"
      >
        <path
          d="M5 18.5h4"
          className="icon-write-line"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}

function MenuAction({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="menuitem"
      onClick={onClick}
      className="icon-hover-target group h-11 w-full justify-start gap-2 px-2 text-left text-xs hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink"
    >
      {icon}
      {children}
    </Button>
  );
}
