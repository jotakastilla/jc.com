import { loginAction } from "./actions";

export const metadata = {
  title: "Acceso a Viralia",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ViraliaAdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const hasError = resolvedSearchParams?.error === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-14 text-white">
      <form action={loginAction} className="glass w-full rounded-[2rem] border border-white/10 p-7 md:p-9">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Viralia</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Acceso de administración</h1>
        <p className="mt-3 text-sm leading-6 text-mist/65">Introduce la contraseña de edición.</p>
        <label className="mt-7 block text-sm text-mist/70">
          <span className="mb-2 block">Contraseña</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white"
            name="password"
            required
            type="password"
          />
        </label>
        {hasError ? <p className="mt-3 text-sm text-coral">Contraseña incorrecta o acceso no configurado.</p> : null}
        <button className="mt-7 rounded-full bg-cyan px-5 py-3 text-sm font-semibold text-slate-950" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
