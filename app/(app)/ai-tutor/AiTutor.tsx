"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useChat } from "@ai-sdk/react";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Copy,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Star,
  Trash2,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import {
  getTutorHistorySnapshot,
  parseTutorHistorySnapshot,
  STORAGE_ERROR_EVENT,
  subscribeToTutorHistory,
  type StoredConversation,
  updateTutorHistory,
} from "@/lib/ai-tutor";

const suggestions = [
  "Explain Data Structures and Algorithms",
  "Help me revise my math concepts",
  "Give me a python practice challenge",
  "Solve the equations step by step",
];

function messageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("");
}

function conversationTitle(text: string) {
  const title = text.trim().replace(/\s+/g, " ");
  return title.length > 44 ? `${title.slice(0, 44).trimEnd()}…` : title;
}

export default function AiTutor() {
  const historySnapshot = useSyncExternalStore(
    subscribeToTutorHistory,
    getTutorHistorySnapshot,
    () => null,
  );
  const parsedHistory = useMemo(
    () => parseTutorHistorySnapshot(historySnapshot),
    [historySnapshot],
  );
  const conversations = parsedHistory.history.conversations;
  const sidebarExpanded =
    parsedHistory.history.sidebarExpanded ?? conversations.length > 0;
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai-tutor" }),
    [],
  );
  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error: chatError,
    clearError,
  } = useChat({ transport });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onStorageError = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setStorageError(event.detail);
      }
    };
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
  }, []);

  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;

    updateTutorHistory((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === activeConversationId
          ? { ...conversation, messages, updatedAt: Date.now() }
          : conversation,
      ),
    }));
  }, [activeConversationId, messages]);

  useEffect(() => {
    if (renameId) renameInputRef.current?.focus();
  }, [renameId]);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;
  const isGenerating = status === "submitted" || status === "streaming";
  const filteredConversations = conversations
    .filter((conversation) =>
      conversation.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const pinnedConversations = filteredConversations.filter(
    (conversation) => conversation.pinned,
  );
  const recentConversations = filteredConversations.filter(
    (conversation) => !conversation.pinned,
  );

  function startNewChat() {
    if (isGenerating) stop();
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    clearError();
    setMenuOpen(false);
  }

  function openConversation(conversation: StoredConversation) {
    if (isGenerating) stop();
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    clearError();
  }

  function setSidebarOpen(open: boolean) {
    updateTutorHistory((current) => ({
      ...current,
      sidebarExpanded: open,
    }));
  }

  function toggleSidebar() {
    setSidebarOpen(!sidebarExpanded);
  }

  function submitText(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isGenerating) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConversationId = crypto.randomUUID();
      conversationId = newConversationId;
      updateTutorHistory((current) => ({
        ...current,
        conversations: [
          {
            id: newConversationId,
            title: conversationTitle(trimmedText),
            pinned: false,
            updatedAt: Date.now(),
            messages: [],
          },
          ...current.conversations,
        ],
      }));
      setActiveConversationId(conversationId);
    }

    setInput("");
    clearError();
    void sendMessage({ text: trimmedText });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitText(input);
  }

  function togglePin() {
    if (!activeConversationId) return;
    updateTutorHistory((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === activeConversationId
          ? { ...conversation, pinned: !conversation.pinned }
          : conversation,
      ),
    }));
    setMenuOpen(false);
  }

  function beginRename() {
    if (!activeConversation) return;
    setSidebarOpen(true);
    setRenameId(activeConversation.id);
    setRenameValue(activeConversation.title);
    setMenuOpen(false);
  }

  function saveRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = renameValue.trim();
    if (renameId && title) {
      updateTutorHistory((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === renameId
            ? { ...conversation, title, updatedAt: Date.now() }
            : conversation,
        ),
      }));
    }
    setRenameId(null);
  }

  function deleteConversation() {
    if (!activeConversationId) return;
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    const deletedId = activeConversationId;
    updateTutorHistory((current) => ({
      ...current,
      conversations: current.conversations.filter(
        (conversation) => conversation.id !== deletedId,
      ),
    }));
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setMenuOpen(false);
  }

  async function copyConversation() {
    if (!activeConversation) return;
    const transcript = activeConversation.messages
      .map((message) => `${message.role === "user" ? "You" : "AI Tutor"}: ${messageText(message)}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(transcript);
      setNotice("Conversation copied.");
    } catch {
      setNotice("Could not copy this conversation. Check clipboard permissions.");
    }
    setMenuOpen(false);
  }

  function toggleSearch() {
    setSidebarOpen(true);
    setSearchOpen((open) => !open);
    setSearchQuery("");
  }

  const showThinking =
    isGenerating && messages.at(-1)?.role !== "assistant";

  return (
    <section
      aria-label="AI Tutor"
      className="relative flex h-dvh min-h-0 w-full overflow-hidden bg-paper text-ink"
    >
      <aside
        aria-label="Chat history"
        className={`shrink-0 border-r border-line bg-paper transition-[width] duration-200 motion-reduce:transition-none ${
          sidebarExpanded
            ? "absolute inset-y-0 left-0 z-20 flex w-56 flex-col shadow-lg lg:static lg:shadow-none"
            : "relative z-10 flex w-12 flex-col"
        }`}
      >
        {sidebarExpanded ? (
          <>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3">
              <h2 className="font-heading text-lg font-semibold">Chats</h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Search chats"
                  title="Search chats"
                  onClick={toggleSearch}
                >
                  <Search aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Collapse chat history"
                  title="Collapse chat history"
                  onClick={() => setSidebarOpen(false)}
                >
                  <PanelLeftClose aria-hidden="true" />
                </Button>
              </div>
            </div>
            {searchOpen && (
              <label className="border-b border-line px-3 py-2">
                <span className="sr-only">Search conversations</span>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats"
                  className="h-10 w-full rounded-md border border-line bg-paper px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-corona"
                />
              </label>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start gap-2 px-3 text-left"
                onClick={startNewChat}
              >
                <SquarePen aria-hidden="true" />
                <span>New chat</span>
              </Button>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  aria-expanded={pinnedOpen}
                  className="h-10 w-full justify-start gap-2 px-3 text-left"
                  onClick={() => setPinnedOpen((open) => !open)}
                >
                  <Pin aria-hidden="true" />
                  <span className="flex-1">Pinned</span>
                  {pinnedOpen ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </Button>
                {pinnedOpen && (
                  <div className="mt-1 space-y-1">
                    {pinnedConversations.map((conversation) => (
                      <ConversationButton
                        key={conversation.id}
                        conversation={conversation}
                        active={conversation.id === activeConversationId}
                        onSelect={() => openConversation(conversation)}
                        renameId={renameId}
                        renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        renameInputRef={renameInputRef}
                        onRename={saveRename}
                        onCancelRename={() => setRenameId(null)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Recents
                </p>
                <div className="space-y-1">
                  {recentConversations.map((conversation) => (
                    <ConversationButton
                      key={conversation.id}
                      conversation={conversation}
                      active={conversation.id === activeConversationId}
                      onSelect={() => openConversation(conversation)}
                      renameId={renameId}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      renameInputRef={renameInputRef}
                      onRename={saveRename}
                      onCancelRename={() => setRenameId(null)}
                    />
                  ))}
                  {filteredConversations.length === 0 && (
                    <p className="px-3 py-2 text-xs text-ink-soft">
                      {searchQuery ? "No matching chats." : "No chats yet."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="New chat"
              title="New chat"
              onClick={startNewChat}
            >
              <SquarePen aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Search chats"
              title="Search chats"
              onClick={toggleSearch}
            >
              <Search aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Show pinned chats"
              title="Pinned"
              onClick={() => {
                setPinnedOpen(true);
                setSidebarOpen(true);
              }}
            >
              <Pin aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Show chat history"
              title="Chats"
              onClick={toggleSidebar}
            >
              <MessageCircle aria-hidden="true" />
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end px-3 sm:px-5">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Conversation actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Conversation actions"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Conversation actions"
                className="absolute right-0 top-11 z-30 w-52 rounded-lg border border-line bg-paper p-1 shadow-lg"
              >
                <MenuItem
                  disabled={!activeConversation}
                  onClick={togglePin}
                  icon={activeConversation?.pinned ? <PinOff /> : <Pin />}
                >
                  {activeConversation?.pinned ? "Unpin" : "Pin"}
                </MenuItem>
                <MenuItem
                  disabled={!activeConversation}
                  onClick={beginRename}
                  icon={<SquarePen />}
                >
                  Rename
                </MenuItem>
                <MenuItem
                  disabled={!activeConversation}
                  onClick={deleteConversation}
                  icon={<Trash2 />}
                >
                  Delete
                </MenuItem>
                <MenuItem
                  disabled={!activeConversation}
                  onClick={() => void copyConversation()}
                  icon={<Copy />}
                >
                  Copy conversation
                </MenuItem>
              </div>
            )}
          </div>
        </header>

        {messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-6 text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              AI Tutor
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Your personal study companion
            </p>
            <h2 className="mt-9 text-base font-semibold">
              What are you learning today?
            </h2>
            <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-3 text-left sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submitText(suggestion)}
                  className="relative min-h-14 rounded-[10px] border border-line bg-paper px-4 py-3 text-left text-[13px] leading-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-corona"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-3 top-3 size-1.5 rounded-full bg-corona"
                  />
                  <span className="pl-2">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversation"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <p className="max-w-[min(28rem,90%)] whitespace-pre-wrap rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-6 shadow-sm">
                      {messageText(message)}
                    </p>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-3">
                    <Sparkles
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-corona"
                    />
                    <p className="min-w-0 whitespace-pre-wrap pt-0.5 text-sm leading-6 text-ink">
                      {messageText(message)}
                    </p>
                  </div>
                ),
              )}
              {showThinking && <ThinkingIndicator />}
            </div>
          </div>
        )}

        {(storageError || parsedHistory.error || notice || chatError) && (
          <div
            role={chatError ? "alert" : "status"}
            className="mx-auto mb-2 w-full max-w-3xl px-4 text-sm text-ink-soft sm:px-8"
          >
            {storageError ||
              parsedHistory.error ||
              notice ||
              "The tutor could not respond. Check the provider configuration and try again."}
          </div>
        )}

        <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex min-h-12 w-full max-w-3xl items-end gap-2 rounded-full border border-line bg-paper px-2 py-1.5 shadow-sm focus-within:border-corona focus-within:ring-2 focus-within:ring-corona/20"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Attachments coming soon"
              title="Attachments coming soon"
              className="mb-0.5 shrink-0"
            >
              <Plus aria-hidden="true" />
            </Button>
            <label className="sr-only" htmlFor="ai-tutor-input">
              Ask anything
            </label>
            <textarea
              id="ai-tutor-input"
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitText(input);
                }
              }}
              placeholder="Ask anything"
              className="max-h-32 min-h-9 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-2 text-sm leading-5 outline-none placeholder:text-ink-soft/70 focus-visible:outline-none"
            />
            <div className="relative mb-0.5 flex size-11 shrink-0 items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={
                  isGenerating
                    ? "Stop generating"
                    : input.trim()
                      ? "Send message"
                      : "Voice input coming soon"
                }
                title={
                  isGenerating
                    ? "Stop generating"
                    : input.trim()
                      ? "Send message"
                      : "Voice input coming soon"
                }
                onClick={() => {
                  if (isGenerating) stop();
                  else if (input.trim()) submitText(input);
                }}
                className={`absolute size-11 rounded-full p-1 transition-opacity duration-150 motion-reduce:transition-none sm:size-9 sm:p-0 ${
                  isGenerating || input.trim()
                    ? "opacity-100"
                    : "cursor-default text-ink-soft/50"
                }`}
              >
                <span className="sr-only">
                  {isGenerating
                    ? "Stop generating"
                    : input.trim()
                      ? "Send message"
                      : "Voice input coming soon"}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
                    isGenerating ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <CircleStop />
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
                    !isGenerating && input.trim()
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                >
                  <ArrowUp />
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${
                    !isGenerating && !input.trim()
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                >
                  <Mic />
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function ConversationButton({
  conversation,
  active,
  onSelect,
  renameId,
  renameValue,
  setRenameValue,
  renameInputRef,
  onRename,
  onCancelRename,
}: {
  conversation: StoredConversation;
  active: boolean;
  onSelect: () => void;
  renameId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onRename: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelRename: () => void;
}) {
  if (renameId === conversation.id) {
    return (
      <form onSubmit={onRename} className="px-1">
        <label className="sr-only" htmlFor={`rename-${conversation.id}`}>
          Rename conversation
        </label>
        <input
          ref={renameInputRef}
          id={`rename-${conversation.id}`}
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onBlur={onCancelRename}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancelRename();
          }}
          className="h-10 w-full rounded-md border border-corona bg-paper px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-corona"
        />
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      aria-current={active ? "page" : undefined}
      className={`h-10 w-full min-w-0 justify-start gap-2 px-2 text-left text-xs ${
        active ? "bg-mist text-ink" : "text-ink-soft"
      }`}
      onClick={onSelect}
    >
      <MessageCircle aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{conversation.title}</span>
    </Button>
  );
}

function MenuItem({
  children,
  icon,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="h-11 w-full justify-start gap-2 px-3 text-left text-sm"
    >
      {icon}
      {children}
    </Button>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <Sparkles
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-corona"
      />
      <div role="status">
        <p className="text-sm">Thinking...</p>
        <p className="mt-1 font-mono text-[10px] text-ink-soft">
          Working through this with you
        </p>
        <div aria-hidden="true" className="mt-2 flex gap-1.5 text-corona">
          {[0, 1, 2].map((star) => (
            <Star
              key={star}
              className="size-2.5 motion-safe:animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${star * 140}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
