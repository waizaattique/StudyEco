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

  const user = { id: data.user.id, email: data.user.email ?? null };
  return (
    <AuthUserProvider user={user}>
      <div className="lg:flex">
        <AppNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </AuthUserProvider>
  );
}
