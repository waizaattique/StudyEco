import { useSyncExternalStore, useMemo } from 'react';
import { useAuthUser } from '@/components/AuthUserProvider';
import { getDisplayName } from '@/lib/auth/display-name';
import { listChats } from '@/lib/chat-store';
import { useRouter } from 'next/navigation';

export default function TutorHome() {
  const user = useAuthUser();
  const userId = user.id;
  const router = useRouter();

  // Sync external store for visit flag (primitive boolean)
  const hasVisited = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    () => !!window.localStorage.getItem(`studyeco:tutor-visited:${userId}`)
  );

  // Memoized shortcuts derived from chat store (stable array via useMemo)
  const shortcuts = useMemo(() => {
    return listChats(userId).slice(0, 3).map((c) => ({ id: c.id, title: c.title }));
  }, [userId]);

  const handleShortcut = (chatId: string) => {
    router.push(`/ai-tutor?chat=${encodeURIComponent(chatId)}`);
  };

  const displayName = getDisplayName(user);


  const handleShortcut = (chatId: string) => {
    router.push(`/ai-tutor?chat=${encodeURIComponent(chatId)}`);
  };

  const displayName = getDisplayName(user);

  return (
    <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
      <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-6xl">Hello, {displayName}.</h1>
      <p className="mt-2 text-base text-ink-soft">What are we studying today?</p>
      {shortcuts.length > 0 && (
        <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {shortcuts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleShortcut(c.id)}
              className="min-h-14 rounded-xl border border-line bg-paper px-4 py-3 text-left text-[13px] leading-5 hover:bg-mist motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
