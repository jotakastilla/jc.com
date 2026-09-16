import { NextResponse } from "next/server";
import { runViraliaRadarScan } from "../../../../lib/radar/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel interpreta el cron en UTC: 07:00 y 17:00 UTC son las dos pasadas
// diarias de Radar (08:00/18:00 en invierno; 09:00/19:00 en verano en España).

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runViraliaRadarScan());
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Radar de actualidad scan failed." }, { status: 500 });
  }
}
