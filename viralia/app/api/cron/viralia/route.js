import { NextResponse } from "next/server";
import { getViraliaAutomationHealth, runViraliaAutomation } from "../../../../lib/trendcast/automation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("health") === "1") {
    try {
      return NextResponse.json(await getViraliaAutomationHealth());
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Viralia runtime health check failed." },
        { status: 500 }
      );
    }
  }
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runViraliaAutomation({ force });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Viralia daily automation failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Viralia automation failed.",
      },
      { status: 500 }
    );
  }
}
