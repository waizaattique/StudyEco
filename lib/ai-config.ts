import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * Shared server-side AI configuration for the tutor.
 *
 * Provider selection and credentials are read only from server environment
 * variables. Groq uses the requested Llama 3.3 70B Versatile model. Keeping
 * model choice, response limits, and tutor behavior here ensures every server
 * entry point uses the same configuration.
 */
export const MAX_OUTPUT_TOKENS = 1500;
export const TEMPERATURE = 0.5;

export const SYSTEM_PROMPT =
  "You are StudyEco's AI Tutor, a patient study companion for students. " +
  "Explain concepts step by step, starting from the simplest idea. Give a concrete " +
  "example for every concept. Use Markdown: short headings, bullet lists, and " +
  "fenced code blocks with a language tag. When asked to solve something, show " +
  "the working, then the answer. End with one short question or practice task " +
  "that checks understanding. Be friendly and encouraging. Avoid filler. If a " +
  "request is unrelated to studying or learning, gently steer back.";

export function getConfiguredProvider() {
  return process.env.AI_PROVIDER?.trim() || "google";
}

// free-tier model IDs change; override with GOOGLE_MODEL / GOOGLE_FALLBACK_MODEL in .env.local
export function getGoogleModelId() {
  return process.env.GOOGLE_MODEL?.trim() || "gemini-3.5-flash-lite";
}

export function getGoogleFallbackModelId() {
  return process.env.GOOGLE_FALLBACK_MODEL?.trim() || "gemini-3.5-flash-lite";
}

export function hasGroqApiKey() {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(
    key && key !== "your-groq-key-here" && key !== "your-key-here",
  );
}

export class AIProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderConfigurationError";
  }
}

function requireApiKey(value: string | undefined, name: string) {
  const key = value?.trim();
  if (!key || key === "your-key-here" || key === "your-groq-key-here") {
    throw new AIProviderConfigurationError(
      `AI Tutor is not configured. Set a valid ${name} in the server environment.`,
    );
  }
}

export function getModel(
  provider = getConfiguredProvider(),
  modelId?: string,
): LanguageModel {
  if (provider === "google") {
    requireApiKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY, "GOOGLE_GENERATIVE_AI_API_KEY");
    return google(modelId || getGoogleModelId());
  }

  if (provider === "groq") {
    requireApiKey(process.env.GROQ_API_KEY, "GROQ_API_KEY");
    return groq("llama-3.3-70b-versatile");
  }

  throw new AIProviderConfigurationError(
    `Unsupported AI_PROVIDER "${provider}". Set it to "google" or "groq".`,
  );
}
