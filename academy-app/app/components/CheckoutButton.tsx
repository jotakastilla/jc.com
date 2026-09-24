"use client";

import { useState } from "react";

export function CheckoutButton({ priceId, children }: { priceId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function startCheckout() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "No hemos podido abrir el pago.");
      window.location.assign(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No hemos podido abrir el pago."); setLoading(false); }
  }
  return <div><button type="button" className="btn" onClick={startCheckout} disabled={loading}>{loading ? "Abriendo pago…" : children}</button>{error ? <p className="checkoutError" role="alert">{error}</p> : null}</div>;
}
