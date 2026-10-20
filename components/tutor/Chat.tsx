"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";
import {
  Menu,
  Copy,
  Sparkles,
  SquarePen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/components/AuthUserProvider";
import Composer from "@/components/tutor/Composer";
import HistoryPanel from "@/components/tutor/HistoryPanel";
import {
  deleteChat,
  getChat,
  getChatSnapshot,
  listChats,
  parseChatSnapshot,
  renameChat,
  saveChat,
  subscribeToChats,
  togglePin,
  type StoredChat,
} from "@/lib/chat-store";

const suggestions = [
  "Explain Data Structures and Algorithms",
  "Help me revise my math concepts",
  "Give me a python practice challenge",
  "Solve the equations step by step",
];
const thinkingCaptions = [
  "Reading your question",
  "Finding examples",
  "Putting it together",
];
const MAX_SENT_MESSAGES = 20;

let latestServerError = "";
let latestServerStatus = 0;
const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { ...body, messages: messages.slice(-MAX_SENT_MESSAGES) },
  }),
  fetch: async (input, init) => {
    latestServerError = "";
    latestServerStatus = 0;
    const response = await fetch(input, init);
    latestServerStatus = response.status;
    if (!response.ok) {
      try {
        const body: unknown = await response.clone().json();
        if (
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
        ) {
          latestServerError = body.error;
        }
      } catch {
        latestServerError = "";
      }
    }
    return response;
  },
});

function messageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("");
}

function chatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const firstUserText = firstUserMessage ? messageText(firstUserMessage) : "";
  const title = firstUserText?.trim().replace(/\s+/g, " ") || "New chat";
  return title.length > 44 ? `${title.slice(0, 44).trimEnd()}…` : title;
}

function repairOpenCodeFence(markdown: string) {
  let openFence: { marker: string; length: number } | null = null;
  for (const line of markdown.split("\n")) {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (!fence) continue;
    const marker = fence[1][0];
    const length = fence[1].length;
    if (!openFence) {
      openFence = { marker, length };
    } else if (
      openFence.marker === marker &&
      length >= openFence.length &&
      new RegExp(`^\\s{0,3}${marker}{${openFence.length},}\\s*$`).test(line)
    ) {
      openFence = null;
    }
  }
  return openFence
    ? `${markdown}\n${openFence.marker.repeat(openFence.length)}`
    : markdown;
}

function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="min-w-0 break-words text-sm leading-6 [&_a]:text-corona-dim [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-mist [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-line [&_pre]:bg-mist [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        components={{
          code({ children, className, ...props }) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {repairOpenCodeFence(text)}
      </ReactMarkdown>
    </div>
  );
}

function ThinkingCaption({ isThinking }: { isThinking: boolean }) {
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) return;
    const interval = window.setInterval(
      () =>
        setCaptionIndex((index) => (index + 1) % thinkingCaptions.length),
      2_000,
    );
    return () => window.clearInterval(interval);
  }, [isThinking]);

  return (
    <div role="status" aria-label="Thinking">
      <p className="text-sm font-medium">Thinking...</p>
      <p className="mt-1 text-xs text-ink-soft motion-safe:transition-opacity motion-safe:duration-300">
        {thinkingCaptions[captionIndex]}
      </p>
      <div aria-hidden="true" className="mt-2 flex gap-1.5 text-corona">
        {[0, 1, 2].map((star) => (
          <Sparkles
            key={star}
            className={`size-3 ${isThinking ? "motion-safe:animate-pulse" : ""}`}
            style={{ animationDelay: `${star * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantRow({
  text,
  isThinking,
  isGenerating,
  onCopy,
  copied = false,
  stopped,
  error,
}: {
  text: string;
  isThinking: boolean;
  isGenerating: boolean;
  onCopy?: () => void;
  copied?: boolean;
  stopped: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Sparkles
        aria-hidden="true"
        className={`mt-1 size-4 shrink-0 text-corona ${
          isGenerating ? "motion-safe:animate-pulse" : ""
        }`}
      />
      <div className="grid min-w-0 flex-1">
        <div
          className={`col-start-1 row-start-1 min-w-0 motion-safe:transition-opacity motion-safe:duration-300 ${
            isThinking ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-hidden={isThinking}
        >
          {error ? (
            <p className="rounded-lg border border-line bg-mist px-3 py-2 text-sm text-ink-soft">
              {text}
            </p>
          ) : (
            <MarkdownMessage text={text} />
          )}
          {!isGenerating && !error && text && onCopy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={copied ? "Copied" : "Copy assistant message"}
              onClick={onCopy}
              className="mt-1 h-8 gap-1.5 px-2 text-xs text-ink-soft opacity-100 hover:bg-mist motion-safe:transition-opacity motion-safe:duration-150 sm:opacity-0 sm:group-hover/assistant:opacity-100 sm:group-focus-within/assistant:opacity-100 focus-visible:ring-2 focus-visible:ring-corona"
            >
              <Copy aria-hidden="true" className="size-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          {stopped && (
            <span className="mt-1 block text-[11px] text-ink-soft">
              Stopped
            </span>
          )}
        </div>
        {isGenerating && (
          <div
            className={`col-start-1 row-start-1 motion-safe:transition-opacity motion-safe:duration-300 ${
              isThinking ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isThinking}
          >
            <ThinkingCaption isThinking={isThinking} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const user = useAuthUser();
  const userId = user.id;
  const subscribe = useCallback(
    (callback: () => void) => subscribeToChats(callback, userId),
    [userId],
  );
  const getSnapshot = useCallback(() => getChatSnapshot(userId), [userId]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const parsedHistory = useMemo(() => parseChatSnapshot(snapshot), [snapshot]);
  const chats = parsedHistory.chats;
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [stoppedMessageIds, setStoppedMessageIds] = useState<string[]>([]);
  const [generationKey, setGenerationKey] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const activeChatIdRef = useRef<string | null>(null);
  const turnChatIdsRef = useRef(new Map<string, string>());
  const pendingPromptRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const loadedInitialChatRef = useRef(false);

  const saveFinishedTurn = useCallback(
    ({
      message,
      messages,
      isAbort,
      isError,
      isDisconnect,
    }: {
      message: UIMessage;
      messages: UIMessage[];
      isAbort: boolean;
      isError: boolean;
      isDisconnect: boolean;
    }) => {
      const lastUserMessage = [...messages]
        .reverse()
        .find((item) => item.role === "user");
      const chatId = lastUserMessage
        ? turnChatIdsRef.current.get(lastUserMessage.id)
        : undefined;
      if (lastUserMessage) turnChatIdsRef.current.delete(lastUserMessage.id);
      if (!chatId || messages.length === 0 || isError || isDisconnect) return;
      const existing = getChat(chatId, userId);
      const messageIds = new Set(messages.map((item) => item.id));
      const priorStoppedIds = (existing?.stoppedMessageIds ?? []).filter(
        (id) => messageIds.has(id),
      );
      const stoppedIds = isAbort
        ? Array.from(new Set([...priorStoppedIds, message.id]))
        : priorStoppedIds.filter((id) => id !== message.id);
      try {
        saveChat(
          {
            id: chatId,
            title: existing?.title ?? chatTitle(messages),
            messages,
            updatedAt: Date.now(),
            pinned: existing?.pinned ?? false,
            stoppedMessageIds: stoppedIds,
          },
          userId,
        );
        if (activeChatIdRef.current === chatId) {
          setStoppedMessageIds(stoppedIds);
        }
        pendingPromptRef.current = "";
      } catch {
        setErrorMessage(
          "Your response is ready, but this chat could not be saved in this browser.",
        );
      }
    },
    [userId],
  );

  const handleChatError = useCallback((error: Error) => {
    if (latestServerStatus === 401) {
      setSessionExpired(true);
      setErrorMessage("");
      return;
    }
    setSessionExpired(false);
    const message =
      latestServerError ||
      (error.message.includes("429")
        ? "The free model is busy. Wait a few seconds and send again."
        : "I couldn't send that message. Please try again.");
    setErrorMessage(message);
  }, []);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error,
    clearError,
  } = useChat({
    transport: chatTransport,
    onFinish: saveFinishedTurn,
    onError: handleChatError,
  });

  useEffect(() => {
    if (!error) return;
    const failedPrompt = pendingPromptRef.current;
    setInput((current) => current || failedPrompt);
    pendingPromptRef.current = "";
    turnChatIdsRef.current.clear();
    setMessages((current) => {
      const last = current.at(-1);
      return last?.role === "user" &&
        messageText(last) === failedPrompt
        ? current.slice(0, -1)
        : current;
    });
  }, [error, setMessages]);

  useEffect(() => {
    if (loadedInitialChatRef.current || snapshot === null) return;
    const timer = window.setTimeout(() => {
      loadedInitialChatRef.current = true;
      if (parsedHistory.error) {
        setErrorMessage(parsedHistory.error);
        return;
      }
      const latest = listChats(userId)[0];
      if (latest) {
        activeChatIdRef.current = latest.id;
        setActiveChatId(latest.id);
        setMessages(latest.messages);
        setStoppedMessageIds(latest.stoppedMessageIds ?? []);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [parsedHistory.error, setMessages, snapshot, userId]);

  const isGenerating = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!autoScrollRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "auto",
    });
  }, [messages, status, errorMessage]);

  function updateScrollPosition() {
    const element = scrollRef.current;
    if (!element) return;
    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    autoScrollRef.current = atBottom;
    setIsAtBottom(atBottom);
  }

  function beginNewChat() {
    if (isGenerating) stop();
    activeChatIdRef.current = null;
    setActiveChatId(null);
    setMessages([]);
    setStoppedMessageIds([]);
    setInput("");
    setErrorMessage("");
    setSessionExpired(false);
    clearError();
    autoScrollRef.current = true;
    setIsAtBottom(true);
  }

  function selectChat(chat: StoredChat) {
    if (isGenerating) stop();
    activeChatIdRef.current = chat.id;
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setStoppedMessageIds(chat.stoppedMessageIds ?? []);
    setInput("");
    setErrorMessage("");
    setSessionExpired(false);
    clearError();
    autoScrollRef.current = true;
    setIsAtBottom(true);
  }

  function submitText(value = input) {
    const text = value.trim();
    if (!text || isGenerating) return;

    let chatId = activeChatIdRef.current;
    if (!chatId) {
      chatId = crypto.randomUUID();
      activeChatIdRef.current = chatId;
      setActiveChatId(chatId);
    }
    pendingPromptRef.current = text;
    const messageId = crypto.randomUUID();
    turnChatIdsRef.current.set(messageId, chatId);
    const visibleMessageIds = new Set(messages.map((message) => message.id));
    setStoppedMessageIds((ids) => ids.filter((id) => visibleMessageIds.has(id)));
    setInput("");
    setErrorMessage("");
    setSessionExpired(false);
    clearError();
    setGenerationKey((key) => key + 1);
    autoScrollRef.current = true;
    setIsAtBottom(true);
    void sendMessage({
      id: messageId,
      role: "user",
      parts: [{ type: "text", text }],
    });
  }

  function handleStop() {
    stop();
  }

  function handleDelete(chatId: string) {
    try {
      deleteChat(chatId, userId);
      if (activeChatIdRef.current === chatId) beginNewChat();
    } catch {
      setErrorMessage("This chat could not be deleted. Please try again.");
    }
  }

  function handlePin(chatId: string) {
    try {
      togglePin(chatId, userId);
    } catch {
      setErrorMessage("This chat could not be updated. Please try again.");
    }
  }

  function handleRename(chatId: string, title: string) {
    try {
      renameChat(chatId, title, userId);
    } catch {
      setErrorMessage("This chat could not be renamed. Please try again.");
    }
  }

  async function copyAssistantMessage(messageId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      window.setTimeout(
        () =>
          setCopiedMessageId((current) =>
            current === messageId ? null : current,
          ),
        1_500,
      );
    } catch {
      setErrorMessage("This message could not be copied. Please try again.");
    }
  }

  const lastMessage = messages.at(-1);
  const activeAssistant =
    lastMessage?.role === "assistant" ? lastMessage : undefined;
  const showPendingAssistant = isGenerating && !activeAssistant;
  const showStreamAssistant = isGenerating && Boolean(activeAssistant);
  const orphanedStoppedIds = isGenerating
    ? []
    : stoppedMessageIds.filter(
        (id) => !messages.some((message) => message.id === id),
      );

  return (
    <section
      aria-label="AI Tutor"
      className="relative flex h-[calc(100dvh-69px)] min-h-0 w-full overflow-hidden bg-paper text-ink lg:h-dvh"
    >
      <HistoryPanel
        chats={chats}
        activeChatId={activeChatId}
        expanded={expandedHistory}
        mobileOpen={mobileHistoryOpen}
        onExpandedChange={setExpandedHistory}
        onMobileOpenChange={setMobileHistoryOpen}
        onNewChat={beginNewChat}
        onSelectChat={selectChat}
        onTogglePin={handlePin}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3 sm:px-5 lg:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Open chat history"
            title="Chat history"
            className="size-11 lg:hidden"
            onClick={() => setMobileHistoryOpen(true)}
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-1">
            {activeChatId && (
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label="New chat"
                title="New chat"
                onClick={beginNewChat}
                className="group hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-corona"
              >
                <SquarePen aria-hidden="true" className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:rotate-[-12deg]" />
              </Button>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          onScroll={updateScrollPosition}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8"
          aria-label="Conversation"
        >
          {messages.length === 0 && !errorMessage ? (
            <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-paper text-corona">
                <Sparkles aria-hidden="true" className="size-6" />
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                AI Tutor
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Your personal study companion
              </p>
              <h2 className="mt-9 text-base font-semibold">
                What are you learning today?
              </h2>
              <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitText(suggestion)}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className="min-h-14 rounded-xl border border-line bg-paper px-4 py-3 text-left text-[13px] leading-5 hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-corona"
                  >
                    <Sparkles
                      aria-hidden="true"
                      className="mr-2 inline size-3 text-corona"
                    />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex w-full max-w-3xl flex-col gap-7 pb-5"
              aria-live="polite"
              aria-relevant="additions text"
            >
              <h1 className="sr-only">AI Tutor</h1>
              {messages.length > MAX_SENT_MESSAGES && (
                <p className="text-center text-xs text-ink-soft">
                  Older messages aren&apos;t sent to the tutor.
                </p>
              )}
              {messages.map((message, index) => {
                if (message.role === "user") {
                  return (
                    <div
                      key={message.id}
                      className="flex justify-end motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
                    >
                      <p className="max-w-[min(34rem,90%)] whitespace-pre-wrap rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-6 shadow-sm">
                        {messageText(message)}
                      </p>
                    </div>
                  );
                }

                const isLastStreamingAssistant =
                  showStreamAssistant && index === messages.length - 1;
                return (
                  <div
                    className="group/assistant motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
                    key={
                      isLastStreamingAssistant
                        ? `streaming-assistant-${generationKey}`
                        : message.id
                    }
                  >
                    <AssistantRow
                      text={messageText(message)}
                      isThinking={isLastStreamingAssistant && !messageText(message)}
                      isGenerating={isLastStreamingAssistant}
                      onCopy={() => void copyAssistantMessage(message.id, messageText(message))}
                      copied={copiedMessageId === message.id}
                      stopped={stoppedMessageIds.includes(message.id)}
                    />
                  </div>
                );
              })}

              {showPendingAssistant && (
                <div
                  key={`streaming-assistant-${generationKey}`}
                  className="group/assistant motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
                >
                  <AssistantRow
                    text=""
                    isThinking
                    isGenerating
                    stopped={false}
                  />
                </div>
              )}

              {orphanedStoppedIds.map((id) => (
                <AssistantRow
                  key={`stopped-${id}`}
                  text=""
                  isThinking={false}
                  isGenerating={false}
                  stopped
                />
              ))}

              {errorMessage && (
                <AssistantRow
                  text={errorMessage}
                  isThinking={false}
                  isGenerating={false}
                  stopped={false}
                  error
                />
              )}
            </div>
          )}

          {!isAtBottom && messages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                autoScrollRef.current = true;
                setIsAtBottom(true);
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
              className="sticky bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-paper shadow-sm"
            >
              Jump to latest
            </Button>
          )}
        </div>

        {sessionExpired ? (
          <p
            role="alert"
            className="mx-auto w-full max-w-3xl px-4 text-sm text-ink-soft sm:px-8"
          >
            Your session expired.{" "}
            <Link
              href="/login"
              className="text-corona-dim underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona"
            >
              Log in again.
            </Link>
          </p>
        ) : (
          error &&
          !errorMessage && (
            <p
              role="alert"
              className="mx-auto w-full max-w-3xl px-4 text-sm text-ink-soft sm:px-8"
            >
              I couldn&apos;t send that message. Please try again.
            </p>
          )
        )}
        <div className="shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-5">
          <Composer
            value={input}
            isGenerating={isGenerating}
            onChange={(value) => setInput(value.slice(0, 4_000))}
            onSend={() => submitText()}
            onStop={handleStop}
          />
        </div>
      </div>
    </section>
  );
}
