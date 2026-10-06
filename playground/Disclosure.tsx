"use client";

/**
 * playground/Disclosure.tsx
 *
 * Implements the W3C ARIA APG "Disclosure (Show/Hide)" pattern.
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * Key ARIA requirements met:
 *  - Native <button> element → Enter/Space handled by the browser for free.
 *  - aria-expanded reflects open/closed state.
 *  - aria-controls links the button to its content region by id.
 *  - Content hidden with the HTML `hidden` attribute (not CSS display tricks),
 *    so assistive technologies also skip the content when collapsed.
 */

import { useId, useState } from "react";
import { BRAND } from "@/lib/brand";
import { playgroundSecondaryButton } from "./styles";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface DisclosureProps {
  /** Text rendered inside the toggle button. */
  title: string;
  /** Content revealed when the disclosure is open. */
  children: React.ReactNode;
  /** When true the panel starts open. Defaults to false. */
  defaultOpen?: boolean;
  /** Additional Tailwind classes for the outer wrapper. */
  className?: string;
}

// ─── Core component ──────────────────────────────────────────────────────────

/**
 * A generic, accessible Disclosure / Show-Hide widget.
 *
 * Usage:
 * ```tsx
 * <Disclosure title="What is an FAQ?">
 *   <p>A list of frequently asked questions.</p>
 * </Disclosure>
 * ```
 */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  className = "",
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  /*
   * Each Disclosure instance needs a unique id for the aria-controls /
   * id pairing.  useId() returns a stable, SSR-safe id — no random Math.random().
   */
  const panelId = useId();

  return (
    <div className={`rounded-lg border border-line ${className}`}>
      {/* ── Toggle button ─────────────────────────────────────────────────
          Using a real <button> so Enter / Space work without any extra
          keyboard handlers.  type="button" prevents accidental form submission.
      ──────────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className={`${playgroundSecondaryButton} flex w-full items-center justify-between gap-4 px-5 py-4 text-left`}
      >
        <span>{title}</span>

        {/* Chevron rotates 180° when open — pure CSS, no JS animation lib */}
        <svg
          aria-hidden="true"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-ink-soft transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Content panel ─────────────────────────────────────────────────
          The `hidden` attribute is the correct WAI-ARIA technique:
          it removes the element from the accessibility tree entirely when
          collapsed, which is equivalent to display:none but semantically
          stronger.  `hidden` is set/unset via the prop, not CSS classes,
          so even user-agent stylesheets that override display won't break it.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        id={panelId}
        role="region"
        aria-label={title}
        hidden={!open}
        className="border-t border-line px-5 py-4 text-sm text-ink-soft"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Demo page ───────────────────────────────────────────────────────────────

/**
 * Default export: a playground page showing three real-world usages of
 * the Disclosure component.
 */
export default function DisclosurePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-10 px-4 py-12">
      <h1 className="font-mono text-2xl text-ink">
        Disclosure (Show/Hide) — Playground
      </h1>

      {/* ── Example 1: FAQ item ──────────────────────────────────────── */}
      <section aria-labelledby="faq-heading" className="space-y-3">
        <h2
          id="faq-heading"
          className="font-mono text-base font-semibold text-ink"
        >
          FAQ
        </h2>

        <Disclosure title="What is spaced repetition?">
          <p>
            Spaced repetition is a learning technique that schedules review
            sessions at increasing intervals. Each time you recall a piece of
            information successfully, the next review is pushed further into the
            future — maximising long-term retention with minimal study time.
          </p>
        </Disclosure>

        <Disclosure title={`How does ${BRAND.name} generate my study plan?`}>
          <p>
            We combine your syllabus deadlines, past quiz scores, and daily
            availability to build a personalised timetable. The model rebalances
            the plan automatically whenever you log a study session or mark a
            topic as complete.
          </p>
        </Disclosure>
      </section>

      {/* ── Example 2: AI-generated note summary (collapsed by default) ─ */}
      <section aria-labelledby="note-heading" className="space-y-3">
        <h2
          id="note-heading"
          className="font-mono text-base font-semibold text-ink"
        >
          Lecture Note — Week 4: Organic Chemistry
        </h2>

        {/*
         * The summary is collapsed by default (defaultOpen omitted / false)
         * so the user sees the raw note first and can opt in to the AI summary.
         */}
        <Disclosure title="✦ AI-generated summary">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Generated · not a substitute for the source material
            </p>
            <p>
              This week covered nucleophilic substitution reactions (S
              <sub>N</sub>1 and S<sub>N</sub>2), with emphasis on stereochemical
              outcomes. S<sub>N</sub>2 reactions proceed via a backside-attack
              mechanism giving <em>inversion</em> of configuration, while S
              <sub>N</sub>1 reactions go through a planar carbocation
              intermediate yielding a <em>racemic</em> mixture.
            </p>
            <p>
              Key factors governing pathway selection: substrate class
              (methyl/primary favours S<sub>N</sub>2; tertiary favours S
              <sub>N</sub>1), nucleophile strength, solvent polarity, and
              leaving-group ability.
            </p>
          </div>
        </Disclosure>

        <div className="rounded-lg border border-line bg-paper px-5 py-4 font-mono text-sm text-ink-soft">
          <p>
            Raw notes go here — introduction to nucleophilic substitution, SN1
            vs SN2 mechanisms, energy profiles, etc.
          </p>
        </div>
      </section>

      {/* ── Example 3: Wellness tip ──────────────────────────────────── */}
      <section aria-labelledby="wellness-heading" className="space-y-3">
        <h2
          id="wellness-heading"
          className="font-mono text-base font-semibold text-ink"
        >
          Today&apos;s Wellness Tip
        </h2>

        <Disclosure
          title="🌿 The 4-7-8 breathing technique"
          defaultOpen={true}
          className="bg-mist"
        >
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Exhale completely through your mouth, making a whoosh sound.
            </li>
            <li>
              Inhale quietly through your nose for <strong>4 counts</strong>.
            </li>
            <li>
              Hold your breath for <strong>7 counts</strong>.
            </li>
            <li>
              Exhale completely through your mouth for <strong>8 counts</strong>
              .
            </li>
            <li>Repeat the cycle three more times (four breaths total).</li>
          </ol>
          <p className="mt-3 text-xs text-ink-soft">
            Practising this before a study session can reduce cortisol and
            improve focus.
          </p>
        </Disclosure>
      </section>
    </main>
  );
}
