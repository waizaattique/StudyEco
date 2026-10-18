"use client";

import { ArrowUp, CircleStop, Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComposerProps {
  value: string;
  isGenerating: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export default function Composer({
  value,
  isGenerating,
  onChange,
  onSend,
  onStop,
}: ComposerProps) {
  const showCounter = value.length >= 3_500;
  const actionLabel = isGenerating
    ? "Stop generating"
    : value.trim()
      ? "Send message"
      : "Voice input coming soon";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!isGenerating) onSend();
        }}
        className="flex min-h-14 w-full items-end gap-2 rounded-2xl border border-line bg-paper px-2 py-2 shadow-sm focus-within:border-corona focus-within:ring-2 focus-within:ring-corona/20 sm:px-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Attachments coming soon"
          title="Attachments coming soon"
          className="mb-0.5 size-11 shrink-0 rounded-full text-ink-soft"
        >
          <Plus aria-hidden="true" />
        </Button>
        <label className="sr-only" htmlFor="tutor-composer">
          Ask your tutor
        </label>
        <textarea
          id="tutor-composer"
          rows={1}
          maxLength={4_000}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!isGenerating) onSend();
            }
          }}
          placeholder="Ask anything..."
          className="max-h-36 min-h-10 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-2 text-base leading-6 outline-none placeholder:text-ink-soft/70 focus-visible:outline-none sm:text-sm"
        />
        <Button
          type={isGenerating || value.trim() ? "submit" : "button"}
          variant="ghost"
          size="icon-lg"
          aria-label={actionLabel}
          title={
            !isGenerating && !value.trim()
              ? "Voice input coming soon"
              : actionLabel
          }
          onClick={isGenerating ? onStop : undefined}
          onKeyDown={(event) => {
            if (
              !isGenerating &&
              !value.trim() &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
            }
          }}
          className={`relative mb-0.5 size-11 shrink-0 rounded-full transition-colors ${
            isGenerating || value.trim()
              ? "bg-ink text-paper hover:bg-corona hover:text-ink"
              : "cursor-default bg-mist text-ink-soft"
          }`}
        >
          <Mic
            aria-hidden="true"
            className={`absolute size-5 transition-opacity duration-150 ${
              !isGenerating && !value.trim() ? "opacity-100" : "opacity-0"
            }`}
          />
          <ArrowUp
            aria-hidden="true"
            className={`absolute size-5 transition-opacity duration-150 ${
              !isGenerating && value.trim() ? "opacity-100" : "opacity-0"
            }`}
          />
          <CircleStop
            aria-hidden="true"
            className={`absolute size-5 transition-opacity duration-150 ${
              isGenerating ? "opacity-100" : "opacity-0"
            }`}
          />
        </Button>
      </form>
      {showCounter && (
        <p
          aria-live="polite"
          className="mt-1 px-3 text-right text-xs text-ink-soft"
        >
          {value.length.toLocaleString()} / 4,000
        </p>
      )}
    </div>
  );
}
