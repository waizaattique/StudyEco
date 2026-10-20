import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <LoginForm
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
