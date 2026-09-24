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
    full: process.env.STRIPE_ACADEMY_FULL_PRICE_ID ?? "price_1UIn4LCkQwL0gBc1kKI8e6JY",
    reduced: process.env.STRIPE_ACADEMY_REDUCED_PRICE_ID ?? "price_1UIn8CCkQwL0gBc1BYwBkFIi",
    reservation: process.env.STRIPE_ACADEMY_RESERVATION_PRICE_ID ?? "price_1UIn7HCkQwL0gBc1aXTZTFJG",
    membership: {
      monthly: process.env.STRIPE_ACADEMY_MONTHLY_PRICE_ID ?? "price_1UJALaCkQwL0gBc1lqOf6VP0",
      annual: process.env.STRIPE_ACADEMY_ANNUAL_PRICE_ID ?? "price_1UJAN1CkQwL0gBc1pRangEjW",
      quarterly: process.env.STRIPE_ACADEMY_QUARTERLY_PRICE_ID ?? "price_1UJAN1CkQwL0gBc1sG7zG6Zk",
    },
  },
} as const;
