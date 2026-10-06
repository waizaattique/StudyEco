import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Component Playground" };

const entries = [
  { href: "/playground/disclosure", label: "Disclosure", description: "Show and hide content with an accessible button and panel." },
  { href: "/playground/tabs", label: "Tabs", description: "Switch between related panels with keyboard navigation." },
  { href: "/playground/modal", label: "Modal", description: "Test focus trapping, dismissal, and focus restoration." },
  { href: "/playground/accordion", label: "Accordion", description: "Expand FAQ items one at a time with native buttons." },
  { href: "/playground/tooltip", label: "Tooltip", description: "Show contextual help on hover or keyboard focus." },
  { href: "/playground/card", label: "Card", description: "Review a simple title, body, and footer container." },
  { href: "/playground/form-field", label: "Form field", description: "Check labels, controls, and visible focus states." },
  { href: "/playground/toast", label: "Toast", description: "Trigger a polite status message with timed dismissal." },
] as const;

export default function PlaygroundIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
      <header className="mb-8 space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          {BRAND.name}
        </p>
        <h1 className="font-mono text-2xl text-ink">Component Playground</h1>
        <p className="max-w-prose break-words text-sm text-ink-soft">
          Small, keyboard-friendly component demos for local testing.
        </p>
      </header>

      <nav aria-label="Playground components">
        <ul className="divide-y divide-line">
          {entries.map(({ href, label, description }) => (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className="block min-w-0 break-words py-4 transition-colors hover:text-corona focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corona focus-visible:ring-offset-2"
              >
                <span className="block break-words font-mono text-sm font-semibold text-ink">
                  {label}
                </span>
                <span className="mt-1 block break-words text-sm text-ink-soft">
                  {description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-8 border-t border-line pt-5">
        <Link
          href="/"
          className="font-mono text-xs text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
        >
          Back to app
        </Link>
      </p>
    </main>
  );
}
