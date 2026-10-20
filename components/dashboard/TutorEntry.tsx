import Link from "next/link";

export default function TutorEntry() {
  return (
    <section aria-labelledby="tutor-entry-title" className="pb-9">
      <h2 id="tutor-entry-title" className="text-lg font-medium">
        AI Tutor
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-6 text-ink-soft">
        Ask questions and work through topics step by step.
      </p>
      <Link
        href="/ai-tutor"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2 font-mono text-sm text-paper hover:bg-corona hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona focus-visible:ring-offset-2"
      >
        Open the tutor
      </Link>
    </section>
  );
}
