"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

function validateCredentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") {
    return {
      ok: false as const,
      error: "Enter your email and password.",
    };
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return {
      ok: false as const,
      error: "Password must be at least 8 characters.",
    };
  }
  return {
    ok: true as const,
    email: normalizedEmail,
    password,
  };
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const credentials = validateCredentials(input?.email, input?.password);
  if (!credentials.ok) return { ok: false, error: credentials.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message === "Email not confirmed"
            ? "Confirm your email before logging in."
            : "We couldn't sign you in. Please try again.",
    };
  }
  return { ok: true };
}

export async function signupAction(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const credentials = validateCredentials(input?.email, input?.password);
  if (!credentials.ok) return { ok: false, error: credentials.error };
  if (
    typeof input?.confirmPassword !== "string" ||
    credentials.password !== input.confirmPassword
  ) {
    return { ok: false, error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "User already registered"
          ? "An account with this email already exists. Log in instead."
          : error.message.toLowerCase().includes("password")
            ? error.message
            : "We couldn't create your account. Please try again.",
    };
  }
  if (!data.session) {
    return {
      ok: false,
      error:
        "Your account was created. Check your email to confirm it before logging in.",
    };
  }
  return { ok: true };
}

export async function demoLoginAction(): Promise<AuthActionResult> {
  const email = process.env.DEMO_EMAIL?.trim();
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    return {
      ok: false,
      error: "Demo sign-in is not configured on this server.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[auth/demo] Demo account sign-in failed", error.message);
    return {
      ok: false,
      error: "The demo account is unavailable. Please try again later.",
    };
  }
  return { ok: true };
}

export async function logoutAction(): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth/logout] Sign-out failed", error.message);
    return { ok: false, error: "We couldn't log you out. Please try again." };
  }
  return { ok: true };
}
