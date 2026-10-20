import SignupForm from "@/components/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <SignupForm
      redirectTo={typeof redirectTo === "string" ? redirectTo : undefined}
    />
  );
}
