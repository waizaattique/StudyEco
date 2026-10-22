export function getDisplayName(user: {
  email: string | null;
  userMetadata?: Record<string, unknown>;
}) {
  const email = user.email?.trim() ?? "";
  if (email.toLowerCase().startsWith("demo")) return "Demo";

  const fullName = user.userMetadata?.full_name;
  const name = user.userMetadata?.name;
  const metadataName =
    typeof fullName === "string" && fullName.trim()
      ? fullName
      : typeof name === "string" && name.trim()
        ? name
        : null;
  if (metadataName) return metadataName.trim();

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!localPart) return "Student";
  return localPart
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
