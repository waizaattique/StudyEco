import AppNav from "@/components/AppNav";
import { AuthUserProvider } from "@/components/AuthUserProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth/layout] Session verification failed", error.message);
  }
  if (!data.user) {
    const path = (await headers()).get("x-studyeco-path");
    const destination =
      path && path.startsWith("/") && !path.startsWith("//")
        ? path
        : "/dashboard";
    redirect(`/login?redirectTo=${encodeURIComponent(destination)}`);
  }

  const user = {
    id: data.user.id,
    email: data.user.email ?? null,
    userMetadata: data.user.user_metadata,
  };
  return (
    <AuthUserProvider user={user}>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden lg:flex-row">
        <AppNav />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthUserProvider>
  );
}
