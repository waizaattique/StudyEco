import { BRAND } from "@/lib/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[landing] Session lookup failed", error.message);
  }

  return (
    <main>
      <nav className="navbar">
        <div className="logo">{BRAND.name}</div>

        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="/playground">Playground</a>
          <a href="#about">About</a>
        </div>

        <a href="/login" className="login-btn">
          Login
        </a>
      </nav>

      <section className="hero">
        <h1>Study Smarter, Not Harder</h1>

        <p>Your all-in-one space to learn, organize, and stay on track.</p>

        <a href={data.user ? "/dashboard" : "/signup"} className="start-btn">
          Start Now
        </a>
      </section>
    </main>
  );
}
