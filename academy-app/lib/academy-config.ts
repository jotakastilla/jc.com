export const academyConfig = {
  brandName: "Local Reset Academy",
  tagline: "Aprende de profesionales que trabajan cada día creando contenido.",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://academy.localreset.com",
  supportUrl: "https://wa.me/",
  // Actualiza esta lista cuando se abran nuevas ediciones: se muestra en la portada.
  upcomingEditions: ["OCTUBRE", "NOVIEMBRE"],
  routes: {
    home: "/",
    dashboard: "/dashboard",
    premium: "/premium",
    login: "/login",
    register: "/registro",
  },
  priceIds: {
    monthly: process.env.STRIPE_ACADEMY_MONTHLY_PRICE_ID ?? "",
    annual: process.env.STRIPE_ACADEMY_ANNUAL_PRICE_ID ?? "",
  },
} as const;
