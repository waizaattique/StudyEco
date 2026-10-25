const upcomingFeatures = [
  { name: "Notes", purpose: "Keep class notes in one place." },
  { name: "Timetable", purpose: "Plan study sessions around your week." },
  { name: "Reminders", purpose: "Track upcoming tasks and deadlines." },
  { name: "Exam Prep", purpose: "Practice topics before an exam." },
];

export default function Roadmap() {
  return (
    <section aria-labelledby="roadmap-title">
      <h2 id="roadmap-title" className="text-lg font-semibold text-ink sm:text-xl">
        On the roadmap
      </h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {upcomingFeatures.map((feature) => (
          <li key={feature.name} className="py-3">
            <div className="flex min-h-6 items-center justify-between gap-3">
              <h3 className="text-[15px] font-medium text-ink">{feature.name}</h3>
              <span className="shrink-0 font-mono text-xs font-medium uppercase tracking-wide text-ink-soft">
                Not built yet
              </span>
            </div>
            <p className="mt-1 text-[15px] leading-6 text-ink-soft">
              {feature.purpose}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
