"use client";

/**
 * playground/Tabs.tsx
 *
 * Implements the W3C ARIA APG "Tabs" pattern (automatic activation variant).
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * Key ARIA requirements met:
 *  - role="tablist" wraps all tabs.
 *  - role="tab" on every trigger; aria-selected reflects the active tab.
 *  - role="tabpanel" on every panel; aria-labelledby points back to its tab.
 *  - aria-controls/id pairing links each tab to its panel.
 *  - Roving tabindex: active tab gets tabindex="0", all others get "-1".
 *  - Arrow keys (Left/Right) move focus AND activate (automatic-activation).
 *  - Home/End jump to the first/last tab.
 */

import { useId, useRef, useState } from "react";
import { playgroundSecondaryButton } from "./styles";

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** A single tab entry passed in from the caller. */
interface TabItem {
  /** Text shown in the tab button. */
  label: string;
  /** Content rendered inside the corresponding panel. */
  content: React.ReactNode;
}

interface TabsProps {
  /** Ordered list of tabs to render. Must have at least one item. */
  tabs: TabItem[];
  /**
   * Zero-based index of the initially selected tab.
   * Defaults to 0.
   */
  defaultIndex?: number;
  /** Extra Tailwind classes applied to the outermost wrapper. */
  className?: string;
  /**
   * Accessible label for the tablist itself (surfaced to screen readers
   * as the group label). Required when more than one tablist exists on
   * a page, recommended otherwise.
   */
  ariaLabel?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clamps `value` to [0, max]. */
function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

// ─── Core component ──────────────────────────────────────────────────────────

/**
 * A fully accessible Tabs widget following the ARIA APG pattern.
 *
 * Usage:
 * ```tsx
 * <Tabs
 *   ariaLabel="Dashboard sections"
 *   tabs={[
 *     { label: "Notes",  content: <p>Notes panel</p> },
 *     { label: "Tasks",  content: <p>Tasks panel</p> },
 *   ]}
 * />
 * ```
 */
export function Tabs({
  tabs,
  defaultIndex = 0,
  className = "",
  ariaLabel,
}: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(
    clamp(defaultIndex, tabs.length - 1),
  );

  /*
   * useId() produces a stable, SSR-safe prefix.
   * Each tab button gets id  `${uid}-tab-{i}`
   * Each panel gets       id  `${uid}-panel-{i}`
   * This keeps aria-controls / aria-labelledby wiring correct even when
   * multiple <Tabs> instances are mounted on the same page.
   */
  const uid = useId();
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = (i: number) => `${uid}-panel-${i}`;

  /*
   * Refs array so we can programmatically focus individual tab buttons
   * after updating activeIndex via keyboard.
   */
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function activate(index: number) {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = tabs.length - 1;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        activate(activeIndex === last ? 0 : activeIndex + 1);
        break;

      case "ArrowLeft":
        event.preventDefault();
        activate(activeIndex === 0 ? last : activeIndex - 1);
        break;

      case "Home":
        event.preventDefault();
        activate(0);
        break;

      case "End":
        event.preventDefault();
        activate(last);
        break;

      default:
        break;
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {/* ── Tablist ───────────────────────────────────────────────────────
          role="tablist" is the ARIA container for all tab buttons.
          aria-label gives it an accessible name so screen readers can
          announce "Dashboard sections tab list" when entering the group.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto border-b border-line pb-px"
      >
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;

          return (
            /* ── Tab button ──────────────────────────────────────────────
                role="tab"         → identifies this as a tab trigger.
                aria-selected      → boolean; only true for the active tab.
                aria-controls      → id of the panel this tab owns.
                tabIndex           → roving tabindex: 0 for active, -1 for rest.
                                     This means Tab key always lands on the
                                     active tab (never on inactive ones), and
                                     arrow keys navigate within the tablist.
                type="button"      → prevents accidental form submission.
                onKeyDown          → Left/Right/Home/End keyboard handling.
            ──────────────────────────────────────────────────────────────── */
            <button
              key={tab.label}
              id={tabId(i)}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId(i)}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => activate(i)}
              onKeyDown={handleKeyDown}
              className={[
                `${playgroundSecondaryButton} shrink-0 rounded-b-none px-4 py-2`,
                isActive
                  ? "border border-b-paper border-line bg-paper text-ink -mb-px"
                  : "border border-transparent text-ink-soft hover:text-ink hover:bg-mist",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Panels ────────────────────────────────────────────────────────
          We render ALL panels in the DOM and use the `hidden` attribute to
          hide inactive ones — this is the correct ARIA technique (matches
          the APG example) as it removes inactive panels from the
          accessibility tree while keeping their DOM nodes for instant
          switching without remounting.
      ──────────────────────────────────────────────────────────────────── */}
      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          id={panelId(i)}
          role="tabpanel"
          aria-labelledby={tabId(i)}
          tabIndex={0}
          hidden={i !== activeIndex}
          className="rounded-b-lg rounded-tr-lg border border-t-0 border-line bg-paper px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// ─── Demo page ────────────────────────────────────────────────────────────────

const DEMO_TABS: TabItem[] = [
  {
    label: "Notes",
    content: (
      <div className="space-y-3">
        <h2 className="font-mono text-base font-semibold text-ink">
          Recent Notes
        </h2>
        <ul className="space-y-2 text-sm text-ink-soft">
          {[
            { title: "Week 4 — Organic Chemistry", date: "Today" },
            { title: "Linear Algebra: Eigenvectors", date: "Yesterday" },
            { title: "Macroeconomics: IS-LM Model", date: "2 days ago" },
          ].map((note) => (
            <li
              key={note.title}
              className="flex items-center justify-between rounded-md border border-line px-4 py-3"
            >
              <span>{note.title}</span>
              <span className="text-xs text-ink-soft">{note.date}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    label: "Tasks",
    content: (
      <div className="space-y-3">
        <h2 className="font-mono text-base font-semibold text-ink">
          Upcoming Tasks
        </h2>
        <ul className="space-y-2 text-sm">
          {[
            { task: "Submit lab report", due: "Tomorrow", done: false },
            { task: "Read Chapter 7 (Thermodynamics)", due: "Wed", done: false },
            { task: "Flashcard review — French vocab", due: "Today", done: true },
          ].map((item) => (
            <li
              key={item.task}
              className="flex items-center gap-3 rounded-md border border-line px-4 py-3"
            >
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  item.done ? "border-ink bg-ink" : "border-line"
                }`}
              />
              <span className={item.done ? "text-ink-soft line-through" : "text-ink"}>
                {item.task}
              </span>
              <span className="ml-auto text-xs text-ink-soft">{item.due}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    label: "AI Tutor",
    content: (
      <div className="space-y-4">
        <h2 className="font-mono text-base font-semibold text-ink">
          AI Tutor
        </h2>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-mist px-4 py-3 text-ink-soft">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest">
              Suggested question
            </p>
            <p>
              &ldquo;Can you explain the difference between S<sub>N</sub>1 and S
              <sub>N</sub>2 reactions using a real-world analogy?&rdquo;
            </p>
          </div>
          <div className="rounded-lg border border-line px-4 py-3 text-ink-soft italic">
            Start a conversation — the AI Tutor is ready when you are.
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Wellness",
    content: (
      <div className="space-y-3">
        <h2 className="font-mono text-base font-semibold text-ink">
          Wellness Check-in
        </h2>
        <p className="text-sm text-ink-soft">
          How are you feeling about your workload today?
        </p>
        <div className="flex gap-2">
          {(
            [
              { emoji: "😌", label: "Calm" },
              { emoji: "😐", label: "Okay" },
              { emoji: "😓", label: "Stressed" },
              { emoji: "😤", label: "Overwhelmed" },
            ] satisfies { emoji: string; label: string }[]
          ).map(({ emoji, label }) => (
            <button
              key={label}
              type="button"
              className={`${playgroundSecondaryButton} flex flex-col items-center gap-1 px-4 py-3 text-ink-soft`}
            >
              <span aria-hidden="true" className="text-xl">
                {emoji}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    ),
  },
];

/**
 * Default export: a playground page demonstrating the Tabs component as a
 * dashboard section switcher (Notes | Tasks | AI Tutor | Wellness).
 */
export default function TabsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 font-mono text-2xl text-ink">
        Tabs — Playground
      </h1>

      <Tabs
        ariaLabel="Dashboard sections"
        tabs={DEMO_TABS}
        defaultIndex={0}
      />
    </main>
  );
}
