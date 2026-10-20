"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupAction } from "@/app/actions/auth";
import { BRAND } from "@/lib/brand";
import { safeRedirectTo } from "@/lib/auth/redirect";
import styles from "@/app/signup/signup.module.css";

export default function SignupForm({
  redirectTo,
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const result = await signupAction({
        email,
        password,
        confirmPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(safeRedirectTo(redirectTo));
      router.refresh();
    } catch (cause) {
      console.error("[auth/signup] Sign-up action failed", cause);
      setError("We couldn't create your account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.signupPage}>
      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <h1>{BRAND.name}</h1>
          <h2>Sign Up</h2>

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

          <div className={styles.passwordGroup}>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Create Password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <small className={styles.passwordNote}>
              Password must be at least 8 characters.
            </small>
          </div>

          <div className={styles.passwordInputWrapper}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirm-password"
              name="confirm-password"
              placeholder="Confirm Password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(error)}
            />

            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Creating account..." : "Sign Up"}
          </button>

          <p className={styles.loginText}>
            Already have an account?{" "}
            <Link
              href={
                redirectTo
                  ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
                  : "/login"
              }
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
