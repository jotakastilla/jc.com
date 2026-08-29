import { NextResponse } from "next/server";
import { runViraliaSpecialMonitor } from "../../../../lib/trendcast/automation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runViraliaSpecialMonitor());
  } catch (error) {
    console.error("Viralia special monitor failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Viralia special monitor failed." },
      { status: 500 }
    );
  }
}
