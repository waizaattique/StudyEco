"use client";

import { useState } from "react";
import {
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  PanelLeftClose,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredChat } from "@/lib/chat-store";

interface HistoryPanelProps {
  chats: StoredChat[];
  activeChatId: string | null;
  expanded: boolean;
  mobileOpen: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
  onNewChat: () => void;
  onSelectChat: (chat: StoredChat) => void;
  onTogglePin: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chatId: string) => void;
}

export default function HistoryPanel({
  chats,
  activeChatId,
  expanded,
  mobileOpen,
  onExpandedChange,
  onMobileOpenChange,
  onNewChat,
  onSelectChat,
  onTogglePin,
  onRename,
  onDelete,
}: HistoryPanelProps) {
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const pinnedChats = chats.filter((chat) => chat.pinned);
  const recentChats = chats.filter(
    (chat) =>
      !chat.pinned && chat.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
              onBlur={() => submitRename(chat.id)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setRenamingId(null);
              }}
              className="h-8 w-full rounded-md border border-corona bg-paper px-2 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-corona"
            />
          </form>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              aria-current={activeChatId === chat.id ? "page" : undefined}
              onClick={() => {
                onSelectChat(chat);
                onMobileOpenChange(false);
              }}
              className="h-11 min-w-0 flex-1 justify-start gap-2 overflow-hidden px-2 text-left text-xs"
            >
              <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
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
              className="mr-1 size-11 shrink-0 opacity-100 group-hover:opacity-100 focus-visible:opacity-100 lg:size-9 lg:opacity-0"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                aria-label={`Actions for ${chat.title}`}
                className="absolute right-1 top-9 z-20 w-40 rounded-lg border border-line bg-paper p-1 shadow-lg"
              >
                <MenuAction
                  icon={chat.pinned ? <PinOff /> : <Pin />}
                  onClick={() => {
                    onTogglePin(chat.id);
                    setMenuChatId(null);
                  }}
                >
                  {chat.pinned ? "Unpin" : "Pin"}
                </MenuAction>
                <MenuAction
                  icon={<SquarePen />}
                  onClick={() => beginRename(chat)}
                >
                  Rename
                </MenuAction>
                <MenuAction
                  icon={<Trash2 />}
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

  const panelBody = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3">
        <h2 className="font-heading text-lg font-semibold">Chats</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="size-11"
            aria-label={searchOpen ? "Close chat search" : "Search chats"}
            title="Search chats"
            onClick={() => {
              setSearchOpen((open) => !open);
              setQuery("");
            }}
          >
            <Search aria-hidden="true" />
          </Button>
          {mobileOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="size-11"
              aria-label="Close chat history"
              title="Close chat history"
              onClick={() => onMobileOpenChange(false)}
            >
              <X aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="size-11"
              aria-label="Collapse chat history"
              title="Collapse chat history"
              onClick={() => onExpandedChange(false)}
            >
              <PanelLeftClose aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {searchOpen && (
        <label className="shrink-0 border-b border-line px-3 py-2">
          <span className="sr-only">Search recent chats</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="h-9 w-full rounded-md border border-line bg-paper px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-corona"
          />
        </label>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full justify-start gap-2 px-2 text-left"
          onClick={() => {
            onNewChat();
            onMobileOpenChange(false);
          }}
        >
          <SquarePen aria-hidden="true" />
          <span>New chat</span>
        </Button>

        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            aria-expanded={pinnedOpen}
            className="h-11 w-full justify-start gap-2 px-2 text-left"
            onClick={() => setPinnedOpen((open) => !open)}
          >
            <Pin aria-hidden="true" />
            <span className="flex-1">Pinned</span>
            <ChevronRight
              aria-hidden="true"
              className={`size-4 transition-transform duration-200 ${
                pinnedOpen ? "rotate-90" : ""
              }`}
            />
          </Button>
          {pinnedOpen && (
            <div className="mt-1 space-y-1">
              {pinnedChats.map(renderChatRow)}
              {pinnedChats.length === 0 && (
                <p className="px-3 py-2 text-xs text-ink-soft">No pinned chats.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Recents
          </p>
          <div className="space-y-1">
            {recentChats.map(renderChatRow)}
            {recentChats.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-soft">
                {query.trim()
                  ? "No matching chats."
                  : chats.length === 0
                    ? "No chats yet."
                    : "No recent chats."}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        aria-label="Chat history"
        className={`hidden h-full shrink-0 flex-col overflow-hidden border-r border-line bg-paper transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          expanded ? "w-64" : "w-14"
        }`}
      >
        {expanded ? (
          panelBody
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <RailButton label="New chat" onClick={onNewChat}>
              <SquarePen aria-hidden="true" />
            </RailButton>
            <RailButton
              label="Expand chat history"
              onClick={() => onExpandedChange(true)}
            >
              <MessageCircle aria-hidden="true" />
            </RailButton>
            <RailButton
              label="Search chats"
              onClick={() => {
                onExpandedChange(true);
                setSearchOpen(true);
              }}
            >
              <Search aria-hidden="true" />
            </RailButton>
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="absolute inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close chat history"
            className="absolute inset-0 bg-ink/20"
            onClick={() => onMobileOpenChange(false)}
          />
          <aside
            aria-label="Chat history"
            className="relative flex h-full w-[min(82vw,20rem)] flex-col overflow-hidden border-r border-line bg-paper shadow-lg"
          >
            {panelBody}
          </aside>
        </div>
      )}
    </>
  );
}

function RailButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
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
      className="h-9 w-full justify-start gap-2 px-2 text-left text-xs"
    >
      {icon}
      {children}
    </Button>
  );
}
