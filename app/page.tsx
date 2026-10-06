import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <main>
      <nav className="navbar">
        <div className="logo">{BRAND.name}</div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#blog">Blog</a>
          <a href="/playground">Playground</a>
          <a href="#about">About</a>
        </div>

        <a href="/login" className="login-btn">
          Login
        </a>
      </nav>

      <section className="hero">
        <p className="hero-label">STUDY WORKSPACE</p>
        <h1>Study Smarter, Not Harder</h1>

        <p>Your all-in-one student workspace for notes, planner, reminders, and tasks.</p>

        <a href="/signup" className="start-btn">
          Start Now
        </a>
      </section>
    </main>
  );
}
