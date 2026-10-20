import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ai-tutor/:path*",
    "/exam-prep/:path*",
    "/health/:path*",
    "/notes/:path*",
    "/reminders/:path*",
    "/settings/:path*",
    "/sharing/:path*",
    "/timetable/:path*",
    "/well-being/:path*",
  ],
};
