"use client";

import styles from "./login.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/ai-tutor");
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.formContainer}>
        <h1>{BRAND.name}</h1>
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your Email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            id="password"
            type="password"
            name="password"
            placeholder="Confirm password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <a href="/forgot-password" className={styles.forgotPassword}>
            Forgot your password?
          </a>

          <button className={styles.button} type="submit">
            Login
          </button>

          <p className={styles.signupText}>
            Don&apos;t have an account?{" "}
            <a href="/signup">Sign up</a>
          </p>
        </form>
      </div>
    </main>
  );
}
