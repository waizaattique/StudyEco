import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * Shared server-side AI configuration for the tutor.
 *
 * Provider selection and credentials are read only from server environment
 * variables. Gemini 2.5 Flash is the documented low-latency Flash endpoint;
 * Groq uses the requested Llama 3.3 70B Versatile model. Keeping model choice,
 * response limits, and tutor behavior here ensures every server entry point
 * uses the same configuration.
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

export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? "google";

  if (provider === "google") {
    requireApiKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY, "GOOGLE_GENERATIVE_AI_API_KEY");
    return google("gemini-2.5-flash");
  }

  if (provider === "groq") {
    requireApiKey(process.env.GROQ_API_KEY, "GROQ_API_KEY");
    return groq("llama-3.3-70b-versatile");
  }

  throw new AIProviderConfigurationError(
    `Unsupported AI_PROVIDER "${provider}". Set it to "google" or "groq".`,
  );
}
