"use client";

import { cloneElement, useId } from "react";
import { playgroundField, playgroundPrimaryButton } from "./styles";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </label>
      {cloneFormControl(children, id)}
    </div>
  );
}

function cloneFormControl(child: React.ReactNode, id: string) {
  if (!isFormControl(child)) return child;
  return cloneElement(child, { id });
}

function isFormControl(
  child: React.ReactNode,
): child is React.ReactElement<{ id?: string }> {
  return typeof child === "object" && child !== null && "type" in child;
}

export default function FormFieldPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-12">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">Settings</p>
        <h1 className="font-heading text-3xl font-bold text-ink">Set up the next study block.</h1>
      </div>
      <form
        className="space-y-5 rounded-[14px] border border-line bg-paper p-6 shadow-[2px_2px_5px_rgba(0,0,0,0.12)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <FormField label="Session title">
          <input name="session-title" type="text" placeholder="e.g. Chapter 4 review" className={playgroundField} />
        </FormField>
        <FormField label="Subject">
          <select name="subject" defaultValue="" className={playgroundField}>
            <option value="" disabled>Select a subject</option>
            <option>Organic chemistry</option>
            <option>Linear algebra</option>
            <option>French vocabulary</option>
          </select>
        </FormField>
        <label className="flex items-start gap-3 font-body text-sm text-ink">
          <input
            name="reminder"
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
          <span>Send me a reminder 15 minutes before this session.</span>
        </label>
        <button type="submit" className={playgroundPrimaryButton}>Save settings</button>
      </form>
    </main>
  );
}
