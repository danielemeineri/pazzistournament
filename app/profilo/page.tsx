import { creaMioProfilo } from "./actions";
import { getUtenteCorrente } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfiloPage() {

  const utente =
    await getUtenteCorrente();


  if (utente) {
    redirect("/");
  }


  return (

    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">

      <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center">

        <h1 className="text-3xl font-bold mb-4">
          👤 Configura profilo
        </h1>

        <p className="text-slate-300 mb-8">
          Crea il tuo profilo PazziTournament
          utilizzando l'account con cui hai effettuato
          il login.
        </p>

        <form action={creaMioProfilo}>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold transition"
          >
            👤 Crea il mio profilo
          </button>

        </form>

      </div>

    </main>

  );
}