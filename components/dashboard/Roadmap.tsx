const upcomingFeatures = [
  { name: "Notes", purpose: "Keep class notes in one place." },
  { name: "Timetable", purpose: "Plan study sessions around your week." },
  { name: "Reminders", purpose: "Track upcoming tasks and deadlines." },
  { name: "Exam Prep", purpose: "Practice topics before an exam." },
];

export default function Roadmap() {
  return (
    <section aria-labelledby="roadmap-title">
      <h2 id="roadmap-title" className="text-base font-medium">
        On the roadmap
      </h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {upcomingFeatures.map((feature) => (
          <li key={feature.name} className="py-3">
            <div className="flex min-h-6 items-center justify-between gap-3">
              <h3 className="text-sm font-medium">{feature.name}</h3>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                Not built yet
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-ink-soft">
              {feature.purpose}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
