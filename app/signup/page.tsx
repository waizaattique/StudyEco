"use client";
import styles from "./signup.module.css";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/home");
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
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <div className={styles.passwordGroup}>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Create Password"
                minLength={6}
                maxLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              6–12 characters with letters, numbers, and a symbol
            </small>
          </div>

          <div className={styles.passwordInputWrapper}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirm-password"
              name="confirm-password"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button className={styles.button} type="submit">
            Sign Up
          </button>

          <p className={styles.loginText}>
            Already have an account?{" "}
            <a href="/login">Login</a>
          </p>
        </form>
      </div>
    </main>
  );
}
