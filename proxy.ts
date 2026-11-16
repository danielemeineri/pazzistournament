import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Le API e le pagine con estensioni restano protette.
  matcher: ["/((?!_next/static|_next/image|favicon.ico$).*)"],
};
