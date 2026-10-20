"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoLoginAction, loginAction } from "@/app/actions/auth";
import { BRAND } from "@/lib/brand";
import { safeRedirectTo } from "@/lib/auth/redirect";
import styles from "@/app/login/login.module.css";

export default function LoginForm({
  redirectTo,
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function finishSignIn(
    credentials?: { email: string; password: string },
  ) {
    setError("");
    setPending(true);
    try {
      const result = credentials
        ? await loginAction(credentials)
        : await demoLoginAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(safeRedirectTo(redirectTo));
      router.refresh();
    } catch (cause) {
      console.error("[auth/login] Sign-in action failed", cause);
      setError("We couldn't sign you in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.formContainer}>
        <h1>{BRAND.name}</h1>
        <h2>Login</h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void finishSignIn({ email, password });
          }}
        >
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your Email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
          />

          <input
            id="password"
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
          />

          <Link href="/forgot-password" className={styles.forgotPassword}>
            Forgot your password?
          </Link>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Login"}
          </button>

          <button
            className={styles.button}
            type="button"
            disabled={pending}
            onClick={() => void finishSignIn()}
          >
            {pending ? "Signing in..." : "Try the demo"}
          </button>

          <p className={styles.signupText}>
            Don&apos;t have an account?{" "}
            <Link
              href={
                redirectTo
                  ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                  : "/signup"
              }
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
