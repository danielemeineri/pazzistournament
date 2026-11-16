import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verificaAdminId, verificaCookieQR } from "@/lib/accesso-sito";
import { registraEsterno } from "@/lib/visite-esterne";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const precedenti = response.cookies.getAll();
          response = NextResponse.next({ request });
          precedenti.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  function finale(destinazione: NextResponse) {
    // Conserva anche i cookie Supabase rinnovati quando reindirizziamo.
    response.cookies.getAll().forEach((cookie) => destinazione.cookies.set(cookie));
    destinazione.headers.set("Cache-Control", "private, no-store, max-age=0");
    return destinazione;
  }

  const path = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  // L'ingresso QR verifica autonomamente il token e crea la visita.
  if (/^\/qr\/[^/]+$/.test(path)) return finale(response);
  // Questo endpoint può solo aggiornare una visita anonima già esistente.
  if (path === "/api/visite-esterne") return finale(response);

  const { data: { user }, error } = await supabase.auth.getUser();
  let admin = false;
  let partecipante = false;
  try {
    admin = !error && await verificaAdminId(user?.id);
    if (!admin) partecipante = await verificaCookieQR(
      request.cookies.get("pazzi_qr_token")?.value,
      request.cookies.get("pazzi_visita_id")?.value,
    );
  } catch {
    // Se non possiamo verificare l'accesso, non mostriamo i dati.
    return finale(NextResponse.json({ errore: "Verifica accesso temporaneamente non disponibile. Riprova." }, { status: 503 }));
  }

  if (admin) return finale(response);
  const pubblica = path === "/login" || path === "/accesso-riservato";
  const areaAdmin = path === "/admin" || path.startsWith("/admin/") ||
    path === "/api/admin" || path.startsWith("/api/admin/");
  if (partecipante && !areaAdmin) return finale(response);

  if (pubblica) {
    try { await registraEsterno(request, response); }
    catch { console.error("Registrazione visita esterna non disponibile."); }
    return finale(response);
  }

  const destinazione = path.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)
    ? NextResponse.json({ errore: "Accesso riservato.", ok: false,
        sessioneScaduta: !partecipante && Boolean(request.cookies.get("pazzi_qr_token")?.value || request.cookies.get("pazzi_visita_id")?.value),
      }, { status: partecipante ? 403 : 401 })
    : NextResponse.redirect(new URL("/accesso-riservato", request.url));
  if (!partecipante) {
    try { await registraEsterno(request, destinazione); }
    catch { console.error("Registrazione visita esterna non disponibile."); }
  }
  return finale(destinazione);
}
