import { tool } from "ai";
import { z } from "zod";

const MAX_DAYS_LEFT = 60;
const MIN_HOURS_PER_DAY = 0.5;
const MAX_HOURS_PER_DAY = 12;
const MILLISECONDS_PER_DAY = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
};

/** A problem the student can fix, phrased as plain English. */
export class ToolUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolUserError";
  }
}

export type StudyPlanInput = {
  topic: string;
  examDate: string;
  hoursPerDay: number;
};

export type StudyPlanDay = {
  date: string;
  label: string;
  hours: number;
  phase: "learn" | "practise" | "revise" | "light_review";
};

export type StudyPlanResult = {
  topic: string;
  examDate: string;
  daysLeft: number;
  totalHours: number;
  days: StudyPlanDay[];
  note?: string;
};

/** Parses a strict YYYY-MM-DD string as a UTC midnight, or null when it is not a real date. */
function parseUtcDate(value: string): number | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  // Round-tripping rejects dates such as 2026-02-31, which Date.UTC would roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function toIsoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toDayLabel(timestamp: number): string {
  return new Date(timestamp)
    .toLocaleDateString("en-GB", DAY_LABEL_FORMAT)
    .replace(",", "");
}

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

/**
 * Builds a study plan between today and the day before the exam.
 * Pure: the caller supplies `today` as a YYYY-MM-DD UTC date.
 */
export function buildStudyPlan(
  input: StudyPlanInput,
  today: string,
): StudyPlanResult {
  const topic = input.topic.trim();
  if (topic.length < 2) {
    throw new ToolUserError(
      "Please tell me the subject you want to study, using at least 2 characters.",
    );
  }
  if (topic.length > 80) {
    throw new ToolUserError("Please keep the topic to 80 characters or fewer.");
  }

  const examTimestamp = parseUtcDate(input.examDate);
  if (examTimestamp === null) {
    throw new ToolUserError(
      "Please give the exam date as a real date in YYYY-MM-DD format.",
    );
  }

  const todayTimestamp = parseUtcDate(today);
  if (todayTimestamp === null) {
    throw new ToolUserError(
      "I could not read today's date, so I cannot build the plan.",
    );
  }

  const daysLeft = Math.round(
    (examTimestamp - todayTimestamp) / MILLISECONDS_PER_DAY,
  );

  if (daysLeft < 1) {
    throw new ToolUserError("The exam date has to be after today.");
  }
  if (daysLeft > MAX_DAYS_LEFT) {
    throw new ToolUserError(
      `Please pick an exam date within the next ${MAX_DAYS_LEFT} days.`,
    );
  }

  const hoursPerDay = input.hoursPerDay;
  if (
    !Number.isFinite(hoursPerDay) ||
    hoursPerDay < MIN_HOURS_PER_DAY ||
    hoursPerDay > MAX_HOURS_PER_DAY
  ) {
    throw new ToolUserError(
      "Please choose between 0.5 and 12 hours of studying per day.",
    );
  }

  // The last day is always a lighter review day, so the phases cover the rest.
  const studyDays = daysLeft - 1;
  const learnCount = Math.ceil(studyDays * 0.5);
  const practiseCount = Math.floor(studyDays * 0.3);
  const reviseCount = studyDays - learnCount - practiseCount;

  const phases: Array<StudyPlanDay["phase"]> = [
    ...new Array<StudyPlanDay["phase"]>(learnCount).fill("learn"),
    ...new Array<StudyPlanDay["phase"]>(practiseCount).fill("practise"),
    ...new Array<StudyPlanDay["phase"]>(reviseCount).fill("revise"),
  ];

  const days: StudyPlanDay[] = [];
  for (let index = 0; index < daysLeft; index += 1) {
    const timestamp = todayTimestamp + index * MILLISECONDS_PER_DAY;
    const isLastDay = index === daysLeft - 1;
    const phase = isLastDay ? "light_review" : phases[index];

    days.push({
      date: toIsoDate(timestamp),
      label: toDayLabel(timestamp),
      hours: roundHours(isLastDay ? hoursPerDay / 2 : hoursPerDay),
      phase,
    });
  }

  const notes: string[] = [];
  if (daysLeft <= 2) notes.push("Very little time: focus on the essentials.");
  if (hoursPerDay > 8) notes.push("That is a heavy daily load; add breaks.");

  const totalHours = roundHours(
    days.reduce((total, day) => total + day.hours, 0),
  );

  const result: StudyPlanResult = {
    topic,
    examDate: input.examDate,
    daysLeft,
    totalHours,
    days,
  };
  if (notes.length > 0) result.note = notes.join(" ");

  return result;
}

export const studyPlanTool = tool({
  description:
    "Build a day-by-day study plan for a topic, from today up to the day before the exam. " +
    "Use it when the student names a subject, an exam date and how many hours a day they can study.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe("The subject or skill the student wants to study."),
    examDate: z
      .string()
      .describe("The exam date as a YYYY-MM-DD calendar date in UTC."),
    hoursPerDay: z
      .number()
      .describe(
        "How many hours the student can study each day, between 0.5 and 12.",
      ),
  }),
  execute: async ({ topic, examDate, hoursPerDay }) => {
    // Read the clock at call time so the plan always starts on the real current UTC day.
    const today = new Date().toISOString().slice(0, 10);
    return buildStudyPlan({ topic, examDate, hoursPerDay }, today);
  },
});
