import { isAdmin } from "@/lib/auth";
import { logoutAmministratore } from "@/app/logout/actions";

export default async function LogoutAmministratore() {
  if (!(await isAdmin())) return null;

  return (
    <aside className="flex flex-wrap items-center justify-end gap-3 border-b border-amber-200/20 bg-slate-950 px-4 py-3 text-white">
      <span className="text-sm text-amber-200">Sessione amministratore</span>
      <form action={logoutAmministratore}>
        <button
          type="submit"
          className="rounded-xl border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          Esci
        </button>
      </form>
    </aside>
  );
}
