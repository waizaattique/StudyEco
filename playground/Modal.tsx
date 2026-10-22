"use client";

/**
 * playground/Modal.tsx
 *
 * Implements the W3C ARIA APG "Dialog (Modal)" pattern.
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * Key ARIA requirements met:
 *  - role="dialog" + aria-modal="true" on the panel.
 *  - aria-labelledby links the panel to its visible <h2> title.
 *  - Tab / Shift+Tab are trapped inside the dialog (roving focus guard).
 *  - Focus moves INTO the dialog on open, returns to the trigger on close.
 *  - Escape closes the dialog when dismissible=true; does nothing otherwise.
 *  - Backdrop click closes when dismissible=true; does nothing otherwise.
 *  - Body scroll is locked while the dialog is open.
 *  - Rendered into a React portal so z-index stacking is always correct.
 *
 * Architecture note — backdrop and panel are DOM siblings, not nested:
 *   <body>
 *     … app …
 *     <!-- portal start -->
 *     <div class="backdrop" />      ← presentational, no aria attributes
 *     <div role="dialog" … />       ← interactive, aria-modal="true"
 *     <!-- portal end -->
 *   </body>
 *
 * This avoids the common mistake of wrapping the dialog in an aria-hidden
 * backdrop, which would accidentally remove the dialog from the AT tree.
 */

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  playgroundField,
  playgroundIconButton,
  playgroundPrimaryButton,
  playgroundSecondaryButton,
} from "./styles";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * All elements that can receive keyboard focus in DOM order.
 * Matches the spec-compliant focusable element set.
 */
const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "embed",
  "iframe",
  "input:not([disabled])",
  "object",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ModalProps {
  /** Controls whether the dialog is mounted and visible. */
  open: boolean;
  /**
   * Called when the dialog should close.
   * For dismissible=false modals this is only invoked from within the panel
   * (e.g. an explicit action button) — never from Escape or backdrop.
   */
  onClose: () => void;
  /** Rendered in an <h2> inside the dialog header; linked via aria-labelledby. */
  title: string;
  /** Content rendered in the dialog body. */
  children: React.ReactNode;
  /**
   * true  (default) — Escape and backdrop click close the dialog.
   * false           — only an explicit action inside the dialog can close it.
   */
  dismissible?: boolean;
  /** Extra Tailwind classes applied to the dialog panel itself. */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the list of currently focusable elements inside `container`. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

// ─── Core component ───────────────────────────────────────────────────────────

/**
 * A fully accessible modal dialog following the ARIA APG pattern.
 *
 * Usage:
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <Modal open={open} onClose={() => setOpen(false)} title="My Dialog">
 *   <p>Dialog content here.</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  dismissible = true,
  className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  /**
   * Captures the element that had focus before the modal opened so we can
   * return focus to it precisely when the modal closes — required by ARIA APG.
   */
  const triggerRef = useRef<Element | null>(null);

  // ── Focus management & scroll lock ─────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Snapshot the current active element before we steal focus.
      triggerRef.current = document.activeElement;

      // Preserve any caller-owned inline overflow before locking page scroll.
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Move focus into the dialog on the next animation frame, after the
      // panel has been painted and is queryable.
      const raf = requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = getFocusable(panel);
        // Focus the first focusable child, or the panel itself as fallback.
        (focusable[0] ?? panel).focus();
      });

      return () => {
        cancelAnimationFrame(raf);
        document.body.style.overflow = originalOverflow;
      };
    } else {
      // Return focus to the element that triggered the modal.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    }
  }, [open]);

  // ── Global keyboard handler ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      // ── Escape ─────────────────────────────────────────────────────────
      if (e.key === "Escape") {
        if (dismissible) {
          e.preventDefault();
          onClose();
        }
        // When not dismissible, swallow Escape entirely so it does nothing.
        return;
      }

      // ── Tab / Shift+Tab focus trap ──────────────────────────────────────
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;

        const focusable = getFocusable(panel);

        if (focusable.length === 0) {
          // No focusable children — keep focus on the panel itself.
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: wrap from first → last.
          if (document.activeElement === first || document.activeElement === panel) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: wrap from last → first.
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissible, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/*
       * ── Backdrop ──────────────────────────────────────────────────────────
       * Purely visual. No aria attributes — it has no text content that would
       * confuse AT, and aria-modal="true" on the panel already signals to
       * supporting AT that content behind the dialog is inert.
       *
       * IMPORTANT: the backdrop and the panel are DOM *siblings*, not
       * parent/child. Nesting the dialog inside an aria-hidden backdrop
       * would accidentally hide the dialog from the accessibility tree.
       */}
      <div
        onClick={dismissible ? onClose : undefined}
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
      />

      {/*
       * ── Dialog panel ──────────────────────────────────────────────────────
       * role="dialog"      → identifies this landmark to AT.
       * aria-modal="true"  → tells supporting AT that content outside is inert
       *                      (complements the JS focus trap for AT that honour it).
       * aria-labelledby    → points to the visible <h2> title.
       * tabIndex={-1}      → makes the div programmatically focusable so we can
       *                      fall back to panel.focus() when there are no children.
       */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
          "rounded-xl border border-line bg-paper shadow-2xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
          className,
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2
            id={titleId}
            className="font-mono text-base font-semibold text-ink"
          >
            {title}
          </h2>

          {/*
           * The ✕ button is only rendered for dismissible dialogs.
           * For non-dismissible dialogs the header contains only the title —
           * no close affordance is provided (by design: the user MUST take
           * an explicit action inside the body).
           */}
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className={playgroundIconButton}
            >
              <svg
                aria-hidden="true"
                focusable="false"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </>,
    document.body,
  );
}

// ─── Example 1: AI Tutor question panel (dismissible = true) ─────────────────

function AiTutorExample() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleClose() {
    setOpen(false);
    setSubmitted(false);
    setQuestion("");
  }

  function handleAsk() {
    if (!question.trim()) return;
    setSubmitted(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={playgroundPrimaryButton}
      >
        Ask the AI Tutor →
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="AI Tutor — Ask a Question"
        dismissible={true}
      >
        {!submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Type your question below. The AI Tutor will respond based on your
              current notes and study plan. Press{" "}
              <kbd className="rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-xs">
                Esc
              </kbd>{" "}
              or click outside to dismiss.
            </p>

            <div>
              <label
                htmlFor="tutor-question"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-soft"
              >
                Your question
              </label>
              <textarea
                id="tutor-question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Can you explain the difference between SN1 and SN2 reactions?"
                className={`${playgroundField} resize-none`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className={playgroundSecondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAsk}
                disabled={!question.trim()}
                className={playgroundPrimaryButton}
              >
                Ask
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-mist px-4 py-3 text-sm text-ink-soft">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest">
                Your question
              </p>
              <p className="text-ink">{question}</p>
            </div>
            <div className="rounded-lg border border-line px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                AI Tutor
              </p>
              <p className="text-sm text-ink">
                Great question! S<sub>N</sub>1 and S<sub>N</sub>2 reactions both
                involve nucleophilic substitution, but differ in mechanism: S
                <sub>N</sub>2 is concerted (one step, back-side attack) and
                proceeds with inversion of stereochemistry, while S<sub>N</sub>1
                occurs via a carbocation intermediate and typically gives a
                racemic mixture…
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={playgroundPrimaryButton}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Example 2: Break enforcement (dismissible = false) ──────────────────────

/**
 * Seconds the user must wait before the "Resume studying" button enables.
 * In a real implementation this would be minutes (e.g. 300 for a 5-min break).
 */
const BREAK_SECONDS = 3;

function BreakEnforcementExample() {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(BREAK_SECONDS);

  // Reset and run the countdown each time the modal opens.
  useEffect(() => {
    if (!open) return;

    setRemaining(BREAK_SECONDS);

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const done = remaining === 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={playgroundPrimaryButton}
      >
        Trigger break enforcement →
      </button>

      {/*
       * dismissible={false}:
       *   - No ✕ button is rendered in the header.
       *   - Escape does nothing.
       *   - Backdrop click does nothing.
       *   - Only the "Resume studying" button (enabled after countdown) closes it.
       */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Time for a break 🌿"
        dismissible={false}
      >
        <div className="space-y-6 pb-1 text-center">
          <p className="text-sm text-ink-soft">
            You&apos;ve been studying for 50 minutes. Step away, hydrate, and
            rest your eyes. This dialog will unlock once your break is complete.
          </p>

          {/*
           * Countdown ring — uses role="timer" + aria-live="polite" so
           * screen readers announce the changing value without being
           * excessively noisy (polite = waits for the user to finish
           * what they're doing before announcing).
           */}
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={
              done
                ? "Break complete"
                : `${remaining} second${remaining !== 1 ? "s" : ""} remaining`
            }
            className={[
              "mx-auto flex h-24 w-24 items-center justify-center rounded-full",
              "border-4 transition-colors duration-500",
              done ? "border-ink" : "border-line",
            ].join(" ")}
          >
            {done ? (
              /* Checkmark when countdown completes */
              <svg
                aria-hidden="true"
                focusable="false"
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink-soft"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="font-mono text-4xl font-semibold tabular-nums text-ink">
                {remaining}
              </span>
            )}
          </div>

          {/*
           * The close button is disabled until remaining === 0.
           * It is the ONLY way to close this modal — by design.
           */}
          <button
            type="button"
            disabled={!done}
            onClick={() => setOpen(false)}
            className={playgroundPrimaryButton}
          >
            {done ? "Resume studying" : `Resume studying (${remaining}s)`}
          </button>

          <p className="text-xs text-ink-soft">
            Escape and clicking outside are disabled for this dialog.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ─── Demo page ────────────────────────────────────────────────────────────────

/**
 * Default export: playground page demonstrating both Modal variants.
 */
export default function ModalPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-12 px-4 py-12">
      <h1 className="font-mono text-2xl text-ink">Modal — Playground</h1>

      {/* ── Variant 1: Dismissible ────────────────────────────────────── */}
      <section aria-labelledby="dismissible-heading" className="space-y-3">
        <h2
          id="dismissible-heading"
          className="font-mono text-base font-semibold text-ink"
        >
          Dismissible{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs text-ink-soft">
            dismissible=true
          </code>
        </h2>
        <p className="text-sm text-ink-soft">
          Escape, backdrop click, the ✕ button, and &quot;Cancel&quot; all
          close this dialog. Focus returns to &quot;Ask the AI Tutor&quot;.
        </p>
        <AiTutorExample />
      </section>

      {/* ── Variant 2: Non-dismissible ────────────────────────────────── */}
      <section aria-labelledby="enforced-heading" className="space-y-3">
        <h2
          id="enforced-heading"
          className="font-mono text-base font-semibold text-ink"
        >
          Non-dismissible{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs text-ink-soft">
            dismissible=false
          </code>
        </h2>
        <p className="text-sm text-ink-soft">
          Escape and backdrop click do nothing. &quot;Resume studying&quot; is
          disabled for 3 s (simulating a real break timer). Focus trap still
          active — Tab cycles between the ring and the button.
        </p>
        <BreakEnforcementExample />
      </section>
    </main>
  );
}
