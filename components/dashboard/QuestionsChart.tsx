"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useAuthUser } from "@/components/AuthUserProvider";
import {
  getLast7DaysQuestions,
  subscribeToActivity,
  getActivitySnapshot,
  type DayQuestionCount,
} from "@/lib/activity-store";

const subscribeToHydration = () => () => {};

export default function QuestionsChart() {
  const user = useAuthUser();
  const userId = user.id;

  const subscribe = useCallback(
    (callback: () => void) => subscribeToActivity(userId, callback),
    [userId],
  );

  // useSyncExternalStore to trigger reactivity when activity changes
  const activityVersion = useSyncExternalStore(
    subscribe,
    () => getActivitySnapshot(userId) ?? "",
    () => "",
  );

  const hasMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const days: DayQuestionCount[] = useMemo(() => {
    if (!hasMounted) return [];
    return getLast7DaysQuestions(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, userId, activityVersion]);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const totalQuestions = useMemo(
    () => days.reduce((sum, d) => sum + d.count, 0),
    [days],
  );

  const maxCount = useMemo(
    () => Math.max(1, ...days.map((d) => d.count)),
    [days],
  );

  const allZero = totalQuestions === 0;

  return (
    <section
      aria-labelledby="questions-chart-title"
      className="border-t border-line pt-7"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="questions-chart-title"
          className="text-lg font-semibold text-ink sm:text-xl"
        >
          Questions asked
        </h2>
        <p className="text-[15px] text-ink-soft">
          {hasMounted
            ? `${totalQuestions} ${
                totalQuestions === 1 ? "question" : "questions"
              } this week`
            : "— questions this week"}
        </p>
      </div>

      {!hasMounted ? (
        <div
          aria-hidden="true"
          className="mt-6 flex h-48 w-full items-center justify-center border-y border-line"
        />
      ) : (
        <div className="mt-6 border-y border-line py-5">
          {/* Accessible Table alternative */}
          <table className="sr-only">
            <caption>Questions asked over the last 7 days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Weekday</th>
                <th scope="col">Questions</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <td>{day.fullDateLabel}</td>
                  <td>{day.dayLabel}</td>
                  <td>{day.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Visual 7-day Bar Chart */}
          <div className="relative">
            <div
              className="grid h-44 w-full grid-cols-7 items-end gap-1.5 sm:gap-3"
              role="region"
              aria-label="7-day bar chart"
            >
              {days.map((day) => {
                const heightPercent = Math.max(
                  day.count > 0 ? 12 : 2,
                  Math.round((day.count / maxCount) * 100),
                );
                const isHovered = hoveredDate === day.date;

                return (
                  <div
                    key={day.date}
                    className="group relative flex h-full flex-col items-center justify-end"
                  >
                    {/* Tooltip on hover / keyboard focus */}
                    {isHovered && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute -top-9 z-20 whitespace-nowrap rounded-md border border-line bg-paper px-2 py-1 font-mono text-xs text-ink shadow-md"
                      >
                        {day.fullDateLabel}: {day.count}{" "}
                        {day.count === 1 ? "question" : "questions"}
                      </div>
                    )}

                    {/* Number above bar */}
                    <span
                      aria-hidden="true"
                      className="mb-1.5 font-mono text-xs font-medium text-ink"
                    >
                      {day.count}
                    </span>

                    {/* Bar */}
                    <button
                      type="button"
                      aria-label={`${day.fullDateLabel}: ${day.count} questions`}
                      onMouseEnter={() => setHoveredDate(day.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      onFocus={() => setHoveredDate(day.date)}
                      onBlur={() => setHoveredDate(null)}
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 ${
                        day.isToday ? "bg-ink" : "bg-ink-soft"
                      }`}
                    />

                    {/* Weekday under bar */}
                    <span
                      aria-hidden="true"
                      className="mt-2 text-center font-mono text-xs font-medium text-ink-soft"
                    >
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Empty state overlay when all 7 days have 0 */}
            {allZero && (
              <p
                role="status"
                className="mt-4 text-center text-[15px] leading-6 text-ink-soft"
              >
                No questions yet. Ask the tutor something and it will show up here.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
