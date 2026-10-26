"use client";

import { ArrowUp, CircleStop, Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

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

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string>("");
  const [language, setLanguage] = useState<string>(() => {
    const stored = typeof window !== "undefined" && window.localStorage.getItem("speech-lang");
    return stored ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  });
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      return;
    }
    const recogniser = new SpeechRecognitionConstructor();
    recogniser.continuous = true;
    recogniser.interimResults = true;
    recogniser.lang = language;
    recognitionRef.current = recogniser;
    recogniser.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        onChange(value + (value.endsWith(" ") || final.startsWith(" ") ? "" : " ") + final);
      }
      if (interim) {
        onChange(value + (value.endsWith(" ") || interim.startsWith(" ") ? "" : " ") + interim);
      }
    };
    recogniser.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setSpeechError("Permission denied for microphone.");
      } else {
        setSpeechError(`Speech error: ${e.error}`);
      }
      setIsListening(false);
    };
    recogniser.onend = () => {
      setIsListening(false);
    };
    return () => {
      recogniser.stop();
    };
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSpeechError("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setSpeechError("Failed to start speech recognition.");
      }
    }
  };

  useEffect(() => {
    if (isListening && (isGenerating || value.trim())) {
      recognitionRef.current?.stop();
    }
  }, [isGenerating, value, isListening]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isListening) {
        recognitionRef.current?.stop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isListening]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    window.localStorage.setItem("speech-lang", lang);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isGenerating) onSend();
        }}
        className="flex min-h-14 w-full items-end gap-2 rounded-2xl border border-line bg-paper px-2 py-2 shadow-sm focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/20 sm:px-3"
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
          onChange={(e) => onChange(e.target.value)}
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
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          aria-pressed={isListening}
          disabled={!isSupported}
          title={!isSupported ? "Voice input isn't supported in this browser." : isListening ? "Stop voice input" : "Start voice input"}
          onClick={toggleListening}
          className={`icon-hover-target group relative mb-0.5 size-11 shrink-0 rounded-full motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink ${
            isListening ? "bg-ink text-paper" : "bg-mist text-ink-soft"
          }`}
        >
          {isListening ? (
            <CircleStop aria-hidden="true" className="absolute size-5" />
          ) : (
            <Mic aria-hidden="true" className="absolute size-5" />
          )}
        </Button>
        <select
          value={language}
          onChange={handleLanguageChange}
          className="ml-1 rounded border border-line bg-paper px-1 py-0.5 text-sm"
        >
          <option value={navigator.language || "en-US"}>Browser default ({navigator.language})</option>
          <option value="en-US">English (US)</option>
          <option value="hi-IN">Hindi</option>
          <option value="ur-PK">Urdu</option>
        </select>
        <Button
          type={isGenerating || value.trim() ? "submit" : "button"}
          variant="ghost"
          size="icon-lg"
          aria-label={actionLabel}
          title={!isGenerating && !value.trim() ? "Voice input coming soon" : actionLabel}
          onClick={isGenerating ? onStop : undefined}
          onKeyDown={(event) => {
            if (!isGenerating && !value.trim() && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
            }
          }}
          className={`icon-hover-target group relative mb-0.5 size-11 shrink-0 rounded-full motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-ink ${
            isGenerating || value.trim()
              ? "bg-ink text-paper hover:bg-[#1d1c1c]"
              : "cursor-default bg-mist text-ink-soft"
          }`}
        >
          <Mic
            aria-hidden="true"
            className={`absolute size-5 motion-safe:transition-[opacity,transform] motion-safe:duration-150 ${
              !isGenerating && !value.trim() ? "opacity-100" : "opacity-0"
            } ${!isGenerating && !value.trim() ? "scale-100" : "scale-75"}`}
          />
          <ArrowUp
            aria-hidden="true"
            className={`absolute size-5 motion-safe:transition-[opacity,transform] motion-safe:duration-150 ${
              !isGenerating && value.trim() ? "opacity-100" : "opacity-0"
            } ${!isGenerating && value.trim() ? "scale-100" : "scale-75"}`}
          />
          <CircleStop
            aria-hidden="true"
            className={`absolute size-5 motion-safe:transition-[opacity,transform] motion-safe:duration-150 ${
              isGenerating ? "opacity-100" : "opacity-0"
            } ${isGenerating ? "scale-100" : "scale-75"}`}
          />
        </Button>
      </form>
      {showCounter && (
        <p aria-live="polite" className="mt-1 px-3 text-right text-xs text-ink-soft">
          {value.length.toLocaleString()} / 4,000
        </p>
      )}
      <p className="mt-1 px-3 text-xs text-ink-soft/70">Voice input is processed by your browser's speech service.</p>
      {speechError && (
        <p className="mt-1 px-3 text-xs text-red-600" role="alert">
          {speechError}
        </p>
      )}
    </div>
  );
}
