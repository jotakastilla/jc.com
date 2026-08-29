"use client";

import { useFormStatus } from "react-dom";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-coral/40 px-3 py-2 text-xs font-semibold text-coral transition hover:bg-coral/10 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}

export default function DeleteEpisodeForm({ slug, title, action }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar “${title}”? También se retirará del RSS y, si son propios, sus archivos de Viralia.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <DeleteButton />
    </form>
  );
}
