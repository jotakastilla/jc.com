import { NextResponse } from "next/server";
import { runViraliaPrepublishAutomation } from "../../../../lib/trendcast/automation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runViraliaPrepublishAutomation());
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Viralia prepublish failed." }, { status: 500 });
  }
}
