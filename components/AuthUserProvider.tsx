"use client";

import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown>;
}

const AuthUserContext = createContext<AuthUser | null>(null);

export function AuthUserProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  return (
    <AuthUserContext.Provider value={user}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser() {
  const user = useContext(AuthUserContext);
  if (!user) {
    throw new Error("useAuthUser must be used within AuthUserProvider.");
  }
  return user;
}
