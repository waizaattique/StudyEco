import { BRAND } from "@/lib/brand";

export async function GET() {
  return Response.json({
    status: "ok",
    service: BRAND.slug,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}
