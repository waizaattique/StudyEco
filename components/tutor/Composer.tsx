"use client";

import { ArrowUp, CircleStop } from "lucide-react";
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
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isGenerating) onSend();
      }}
      className="mx-auto flex min-h-14 w-full max-w-3xl items-end gap-2 rounded-2xl border border-line bg-paper px-3 py-2 shadow-sm focus-within:border-corona focus-within:ring-2 focus-within:ring-corona/20"
    >
      <label className="sr-only" htmlFor="tutor-composer">
        Ask your tutor
      </label>
      <textarea
        id="tutor-composer"
        rows={1}
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
        type={isGenerating ? "button" : "submit"}
        variant="ghost"
        size="icon-lg"
        aria-label={isGenerating ? "Stop generating" : "Send message"}
        title={isGenerating ? "Stop generating" : "Send message"}
        disabled={!isGenerating && !value.trim()}
        onClick={isGenerating ? onStop : undefined}
        className="mb-0.5 size-10 shrink-0 rounded-full bg-ink text-paper hover:bg-corona hover:text-ink disabled:bg-mist disabled:text-ink-soft"
      >
        {isGenerating ? (
          <CircleStop aria-hidden="true" />
        ) : (
          <ArrowUp aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}
