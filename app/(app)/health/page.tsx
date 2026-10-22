import { headers } from "next/headers";
import PagePlaceholder from "@/components/PagePlaceholder";

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
};

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    const res = await fetch(`${protocol}://${host}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HealthPage() {
  const health = await getHealth();

  return (
    <PagePlaceholder
      title="Health"
      description="Live status pulled from the app's own health-check endpoint."
    >
      {health ? (
        <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-md border border-line px-6 py-6 text-sm">
          <dt className="font-mono text-ink-soft">Status</dt>
          <dd className="font-mono text-ink">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-ink-soft align-middle" />
            {health.status}
          </dd>

          <dt className="font-mono text-ink-soft">Service</dt>
          <dd className="font-mono text-ink">{health.service}</dd>

          <dt className="font-mono text-ink-soft">Uptime</dt>
          <dd className="font-mono text-ink">{health.uptimeSeconds}s</dd>

          <dt className="font-mono text-ink-soft">Checked at</dt>
          <dd className="font-mono text-ink">{health.timestamp}</dd>
        </dl>
      ) : (
        <div className="mt-10 rounded-md border border-dashed border-line px-6 py-14 text-center text-sm text-ink-soft">
          Couldn&apos;t reach the health endpoint.
        </div>
      )}
    </PagePlaceholder>
  );
}
