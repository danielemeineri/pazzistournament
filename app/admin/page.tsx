
import { getUtenteCorrente } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";

import {
  generaQrMancanti,
  rigeneraQrPartecipante,
} from "./qr-actions";

export default async function AdminPage() {
  const utente = await getUtenteCorrente();

  // Utente non autenticato
  if (!utente) {
    redirect("/login");
  }

  // Utente autenticato ma non ADMIN
  if (utente.profilo.ruolo !== "ADMIN") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-6">🚫</div>

          <h1 className="text-3xl font-bold mb-4">
            Accesso negato
          </h1>

          <p className="text-slate-300">
            Non hai i permessi necessari per accedere
            al pannello amministratore.
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // AZIONI FORM QR - COMPATIBILITÀ TYPESCRIPT
  // =====================================================

  async function generaQrMancantiAction(
    _formData: FormData
  ): Promise<void> {
    "use server";

    await generaQrMancanti();
  }

  async function rigeneraQrPartecipanteAction(
    partecipanteId: number,
    _formData: FormData
  ): Promise<void> {
    "use server";

    await rigeneraQrPartecipante(partecipanteId);
  }

  // =====================================================
  // INDIRIZZO DEL SITO
  // =====================================================

  const headerStore = await headers();

  const dominioConfigurato =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host");

  const protocollo =
    headerStore.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (process.env.NODE_ENV === "production"
      ? "https"
      : "http");

  const baseUrl =
    dominioConfigurato ??
    (host
      ? `${protocollo}://${host}`
      : "http://localhost:3000");

  // =====================================================
  // CARICAMENTO PARTECIPANTI
  // =====================================================

  const partecipanti = await prisma.partecipante.findMany({
    orderBy: {
      nome: "asc",
    },
  });

  const qrMancanti = partecipanti.filter(
    (partecipante) => !partecipante.qrToken
  ).length;

  // =====================================================
  // GENERAZIONE IMMAGINI QR
  // =====================================================

  const partecipantiConQr = await Promise.all(
    partecipanti.map(async (partecipante) => {
      if (!partecipante.qrToken) {
        return {
          ...partecipante,
          qrImmagine: null,
          qrUrl: null,
        };
      }

      const qrUrl =
        `${baseUrl}/qr/${partecipante.qrToken}`;

      const qrImmagine = await QRCode.toDataURL(
        qrUrl,
        {
          width: 400,
          margin: 2,
          errorCorrectionLevel: "H",
        }
      );

      return {
        ...partecipante,
        qrImmagine,
        qrUrl,
      };
    })
  );

  // =====================================================
  // ADMIN
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold mb-3">
          👑 Pannello Amministratore
        </h1>

        <p className="text-slate-300 mb-8">
          Benvenuto {utente.profilo.nome}
        </p>

        {/* INFORMAZIONI ACCOUNT */}

        <div className="bg-slate-800 rounded-3xl p-8 mb-10">

          <h2 className="text-2xl font-bold mb-4">
            Informazioni account
          </h2>

          <div className="space-y-2 text-lg">

            <p>
              👤 Nome:{" "}
              <span className="font-bold">
                {utente.profilo.nome}
              </span>
            </p>

            <p>
              🔐 Ruolo:{" "}
              <span className="text-green-400 font-bold">
                {utente.profilo.ruolo}
              </span>
            </p>

            <p>
              📧 Email:{" "}
              <span className="text-slate-300">
                {utente.user.email}
              </span>
            </p>

          </div>

        </div>

        {/* GESTIONE QR */}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-green-400">
                Codici personali
              </p>

              <h2 className="mt-2 text-3xl font-black">
                📱 Gestione QR partecipanti
              </h2>

              <p className="mt-3 text-slate-400">
                Genera, scarica e rigenera i codici QR
                personali dei partecipanti.
              </p>
            </div>

            {qrMancanti > 0 && (
              <form action={generaQrMancantiAction}>
                <button
                  type="submit"
                  className="rounded-2xl bg-green-500 px-6 py-4 font-bold text-slate-950 transition hover:bg-green-400"
                >
                  Genera QR mancanti ({qrMancanti})
                </button>
              </form>
            )}

          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {partecipantiConQr.map((partecipante) => (

              <div
                key={partecipante.id}
                className="rounded-3xl border border-slate-700 bg-slate-950 p-6 text-center"
              >

                <h3 className="text-2xl font-bold">
                  {partecipante.nome}
                </h3>

                {partecipante.qrImmagine &&
                partecipante.qrUrl ? (
                  <>

                    <div className="mt-5 rounded-2xl bg-white p-3">
                      <img
                        src={partecipante.qrImmagine}
                        alt={`QR personale di ${partecipante.nome}`}
                        className="mx-auto w-full max-w-[260px]"
                      />
                    </div>

                    <a
                      href={partecipante.qrImmagine}
                      download={`QR-${partecipante.nome.replace(
                        /[^a-zA-Z0-9-_]/g,
                        "_"
                      )}.png`}
                      className="mt-5 block rounded-xl bg-green-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-green-400"
                    >
                      Scarica QR PNG
                    </a>

                    <form
                      action={rigeneraQrPartecipanteAction.bind(
                        null,
                        partecipante.id
                      )}
                    >
                      <button
                        type="submit"
                        className="mt-3 w-full rounded-xl border border-red-500/50 bg-red-950/30 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-900/50"
                      >
                        Rigenera QR
                      </button>
                    </form>

                  </>
                ) : (

                  <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-8">

                    <p className="text-slate-400">
                      QR non ancora generato
                    </p>

                  </div>

                )}

              </div>

            ))}

          </div>

          {partecipanti.length === 0 && (
            <p className="mt-8 text-center text-slate-400">
              Non ci sono partecipanti nel database.
            </p>
          )}

        </section>

      </div>
    </main>
  );
}
