import { NextResponse } from "next/server";
import { academyConfig } from "@/lib/academy-config";

export const runtime = "nodejs";

const membershipPrices = new Set(Object.values(academyConfig.priceIds.membership));
const allowedPrices = new Set([
  academyConfig.priceIds.full,
  academyConfig.priceIds.reduced,
  academyConfig.priceIds.reservation,
  ...membershipPrices,
]);

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "El pago aún no está configurado." }, { status: 503 });

  const body = await request.json().catch(() => null) as { priceId?: unknown } | null;
  const priceId = typeof body?.priceId === "string" ? body.priceId : "";
  if (!allowedPrices.has(priceId)) return NextResponse.json({ error: "La tarifa seleccionada no está disponible." }, { status: 400 });

  const origin = new URL(request.url).origin;
  const mode = membershipPrices.has(priceId) ? "subscription" : "payment";
  const form = new URLSearchParams({ mode, "line_items[0][price]": priceId, "line_items[0][quantity]": "1", success_url: `${origin}/pago-confirmado?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/premium` });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "No hemos podido abrir el pago. Prueba de nuevo." }, { status: 502 });
  const session = await response.json() as { url?: string };
  if (!session.url) return NextResponse.json({ error: "No hemos podido abrir el pago." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
