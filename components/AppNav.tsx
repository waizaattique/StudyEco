"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Share2,
  X,
} from "lucide-react";
import { useAuthUser } from "@/components/AuthUserProvider";
import HistoryPanel from "@/components/tutor/HistoryPanel";
import { logoutAction } from "@/app/actions/auth";
import { BRAND } from "@/lib/brand";
import { getDisplayName } from "@/lib/auth/display-name";
import {
  clearChats,
  deleteChat,
  getChatSnapshot,
  parseChatSnapshot,
  renameChat,
  subscribeToChats,
  togglePin,
} from "@/lib/chat-store";

const pageLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-tutor", label: "AI Tutor", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/exam-prep", label: "Exam Prep", icon: GraduationCap },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/sharing", label: "Sharing", icon: Share2 },
  { href: "/well-being", label: "Well-being", icon: HeartPulse },
];
const accountLinks = [
  ...pageLinks,
  { href: "/settings", label: "Settings", icon: Settings },
];

const getEmptySnapshot = () => null;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const displayName = getDisplayName(user);
  const subscribe = useCallback(
    (callback: () => void) => subscribeToChats(callback, user.id),
    [user.id],
  );
  const getSnapshot = useCallback(() => getChatSnapshot(user.id), [user.id]);
  const chatSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getEmptySnapshot,
  );
  const chats = useMemo(
    () => parseChatSnapshot(chatSnapshot).chats,
    [chatSnapshot],
  );
  const [collapsed, setCollapsed] = useState(false);
  const [collapsePreferenceLoaded, setCollapsePreferenceLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [focusSearchToken, setFocusSearchToken] = useState(0);
  const [actionError, setActionError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const lastPathnameRef = useRef(pathname);
  const didInitializeActiveChatRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setCollapsed(
          window.localStorage.getItem("studyeco:sidebar-collapsed") === "true",
        );
      } catch (error) {
        console.error(
          "[navigation/sidebar] Could not read sidebar preference",
          error,
        );
      } finally {
        setCollapsePreferenceLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!collapsePreferenceLoaded) return;
    try {
      window.localStorage.setItem(
        "studyeco:sidebar-collapsed",
        collapsed ? "true" : "false",
      );
    } catch (error) {
      console.error("[navigation/sidebar] Could not save sidebar preference", error);
    }
  }, [collapsed, collapsePreferenceLoaded]);

  useEffect(() => {
    if (
      chatSnapshot === null ||
      pathname !== "/ai-tutor" ||
      didInitializeActiveChatRef.current
    ) {
      return;
    }
    didInitializeActiveChatRef.current = true;
    const requestedId = new URLSearchParams(window.location.search).get("chat");
    setActiveChatId(
      requestedId && chats.some((chat) => chat.id === requestedId)
        ? requestedId
        : chats[0]?.id ?? null,
    );
  }, [chatSnapshot, chats, pathname]);

  useEffect(() => {
    if (lastPathnameRef.current === pathname || chatSnapshot === null) return;
    lastPathnameRef.current = pathname;
    if (pathname === "/ai-tutor") {
      const timer = window.setTimeout(() => {
        const requestedId = new URLSearchParams(window.location.search).get(
          "chat",
        );
        setActiveChatId(
          requestedId && chats.some((chat) => chat.id === requestedId)
            ? requestedId
            : chats[0]?.id ?? null,
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [chatSnapshot, chats, pathname]);

  const closeAccountMenu = useCallback(() => {
    setAccountOpen(false);
    accountButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function syncActiveChatFromUrl() {
      const requestedId = new URLSearchParams(window.location.search).get("chat");
      setActiveChatId(
        requestedId && chats.some((chat) => chat.id === requestedId)
          ? requestedId
          : null,
      );
    }
    window.addEventListener("popstate", syncActiveChatFromUrl);
    return () => window.removeEventListener("popstate", syncActiveChatFromUrl);
  }, [chats]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    accountMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !accountButtonRef.current?.contains(target) &&
        !accountMenuRef.current?.contains(target)
      ) {
        closeAccountMenu();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAccountMenu();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, closeAccountMenu]);

  function onAccountMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(
      accountMenuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (currentIndex + (event.key === "ArrowDown" ? 1 : items.length - 1)) %
            items.length;
    items[nextIndex]?.focus();
  }

  function changeCollapsed(value: boolean) {
    setCollapsed(value);
  }

  function focusChatSearch() {
    setFocusSearchToken((token) => token + 1);
    setCollapsed(false);
    if (pathname !== "/ai-tutor") {
      setMobileOpen(false);
      router.push("/ai-tutor", { scroll: false });
    }
  }

  function startNewChat() {
    setActiveChatId(null);
    setActionError("");
    setMobileOpen(false);
    window.dispatchEvent(new Event("studyeco:new-chat"));
    router.replace("/ai-tutor", { scroll: false });
  }

  function selectChat(chat: { id: string }) {
    setActiveChatId(chat.id);
    setMobileOpen(false);
    router.push(`/ai-tutor?chat=${encodeURIComponent(chat.id)}`, {
      scroll: false,
    });
  }

  function handlePin(chatId: string) {
    setActionError("");
    try {
      togglePin(chatId, user.id);
    } catch (error) {
      console.error("[navigation/chats] Could not update chat pin", error);
      setActionError("This chat could not be updated. Please try again.");
    }
  }

  function handleRename(chatId: string, title: string) {
    setActionError("");
    try {
      renameChat(chatId, title, user.id);
    } catch (error) {
      console.error("[navigation/chats] Could not rename chat", error);
      setActionError("This chat could not be renamed. Please try again.");
    }
  }

  function handleDelete(chatId: string) {
    setActionError("");
    try {
      if (activeChatId === chatId) {
        window.dispatchEvent(
          new CustomEvent("studyeco:chat-deleted", { detail: { chatId } }),
        );
      }
      deleteChat(chatId, user.id);
      if (activeChatId === chatId) startNewChat();
    } catch (error) {
      console.error("[navigation/chats] Could not delete chat", error);
      setActionError("This chat could not be deleted. Please try again.");
    }
  }

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);
    try {
      window.dispatchEvent(new Event("studyeco:logout"));
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

  const isCurrentPage = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const sidebarCollapsed = collapsed && !mobileOpen;
  const sidebarContents = (
    <>
      <header
        className={`flex shrink-0 border-b border-line px-2 ${
          sidebarCollapsed
            ? "h-auto flex-col items-center gap-1 py-2"
            : "h-14 items-center justify-between gap-1"
        }`}
      >
        <Link
          href="/dashboard"
          aria-label={BRAND.name}
          title={sidebarCollapsed ? BRAND.name : undefined}
          onClick={() => setMobileOpen(false)}
          className={`flex min-h-11 min-w-0 items-center rounded-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            sidebarCollapsed
              ? "w-11 justify-center font-mono text-xl font-semibold"
              : "flex-1 px-2 font-mono text-lg"
          }`}
        >
          {sidebarCollapsed ? "S" : BRAND.name}
        </Link>
        <div
          className={`flex shrink-0 ${
            sidebarCollapsed ? "flex-col items-center gap-1" : "items-center gap-0.5"
          }`}
        >
          <button
            type="button"
            onClick={focusChatSearch}
            aria-label="Search chats"
            title="Search chats"
            className="group flex size-11 items-center justify-center rounded-md text-ink-soft hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Search aria-hidden="true" className="icon-scan size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (mobileOpen) {
                setMobileOpen(false);
                mobileMenuButtonRef.current?.focus();
              } else {
                changeCollapsed(!collapsed);
              }
            }}
            aria-label={
              mobileOpen
                ? "Close navigation"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            aria-expanded={mobileOpen || !collapsed}
            aria-controls="app-nav-sidebar"
            title={
              mobileOpen
                ? "Close navigation"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            className="flex size-11 items-center justify-center rounded-md text-ink-soft hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {mobileOpen ? (
              <X aria-hidden="true" className="size-4" />
            ) : collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </header>

      {pathname === "/ai-tutor" ? (
        <HistoryPanel
          chats={chats}
          activeChatId={activeChatId}
          collapsed={sidebarCollapsed}
          focusSearchToken={focusSearchToken}
          onExpand={() => changeCollapsed(false)}
          onNewChat={startNewChat}
          onSelectChat={selectChat}
          onTogglePin={handlePin}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      ) : sidebarCollapsed ? (
        <nav
          aria-label="App navigation"
          className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-2"
        >
          {pageLinks.map((link) => {
            const Icon = link.icon;
            const active = isCurrentPage(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                aria-current={active ? "page" : undefined}
                title={link.label}
                onClick={() => setMobileOpen(false)}
                className={`flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                  active ? "bg-mist text-ink" : ""
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav
          aria-label="App navigation"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
        >
          <ul className="flex flex-col gap-1">
            {pageLinks.map((link) => {
              const Icon = link.icon;
              const active = isCurrentPage(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 font-mono text-sm motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                      active
                        ? "bg-mist text-ink"
                        : "text-ink-soft hover:bg-mist hover:text-ink"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className={`relative mt-auto shrink-0 border-t border-line p-2 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
        {actionError && (
          <p className="mb-2 px-2 text-xs text-red-700" role="alert">
            {actionError}
          </p>
        )}
        {logoutError && (
          <p className="mb-2 px-2 text-xs text-red-700" role="alert">
            {logoutError}
          </p>
        )}
        <button
          ref={accountButtonRef}
          type="button"
          aria-label={`Account menu for ${displayName}`}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-controls="account-menu"
          onClick={() => setAccountOpen((open) => !open)}
          title={sidebarCollapsed ? displayName : undefined}
          className={`group flex min-h-11 items-center rounded-md text-left hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            sidebarCollapsed ? "w-11 justify-center" : "w-full gap-3 px-2"
          }`}
        >
          <span
            aria-hidden="true"
            className="icon-account-avatar flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-mist font-mono text-xs font-medium text-ink"
          >
            {getInitials(displayName)}
          </span>
          {!sidebarCollapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {displayName}
              </span>
              <ChevronDown aria-hidden="true" className="size-4 text-ink-soft" />
            </>
          )}
        </button>
        {accountOpen && (
          <div
            ref={accountMenuRef}
            id="account-menu"
            role="menu"
            aria-label="Account menu"
            onKeyDown={onAccountMenuKeyDown}
            className="absolute bottom-[calc(100%+0.5rem)] left-2 right-2 z-30 max-h-[min(80dvh,32rem)] overflow-y-auto rounded-lg border border-line bg-paper p-2 shadow-lg"
          >
            {user.email && (
              <p
                className="truncate px-3 pb-2 pt-1 text-xs text-ink-soft"
                title={user.email}
              >
                {user.email}
              </p>
            )}
            <ul>
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    role="menuitem"
                    onClick={() => {
                      closeAccountMenu();
                      setMobileOpen(false);
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <link.icon aria-hidden="true" className="size-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="my-1 border-t border-line" aria-hidden="true" />
              <li>
                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={() => {
                    closeAccountMenu();
                    setMobileOpen(false);
                    void handleLogout();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-ink-soft hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-60"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-line bg-paper px-3 lg:hidden">
        <Link
          href="/dashboard"
          className="font-mono text-lg text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {BRAND.name}
        </Link>
        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="app-nav-sidebar"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="flex size-11 items-center justify-center rounded-md border border-line text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {mobileOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => {
            setMobileOpen(false);
            mobileMenuButtonRef.current?.focus();
          }}
          className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
        />
      )}

      <aside
        id="app-nav-sidebar"
        aria-label="App sidebar"
        className={`${
          mobileOpen
            ? "fixed inset-x-0 bottom-0 top-14 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-line bg-paper shadow-lg"
            : "hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-paper"
        } ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        {sidebarContents}
      </aside>
    </>
  );
}
