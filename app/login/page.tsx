"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] =
    useState(false);


  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setErrore("");
    setCaricamento(true);


    const { error } =
      await supabase.auth.signInWithPassword({

        email,
        password,

      });


    if (error) {

      setErrore(
        "Email o password non corretti."
      );

      setCaricamento(false);

      return;

    }


    router.push("/");

    router.refresh();

  }


  return (

    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">


      <div className="w-full max-w-md">


        <div className="bg-slate-800 rounded-3xl p-8 shadow-xl">


          <h1 className="text-4xl font-bold text-center">
            🔐 Login
          </h1>


          <p className="text-center text-slate-300 mt-3 mb-8">
            Accedi a PazziTournament
          </p>



          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >


            <div>

              <label className="block mb-2 font-semibold">
                Email
              </label>


              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                placeholder="Inserisci la tua email"
                className="w-full bg-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
              />

            </div>



            <div>

              <label className="block mb-2 font-semibold">
                Password
              </label>


              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                placeholder="Inserisci la tua password"
                className="w-full bg-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
              />

            </div>



            {errore && (

              <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-xl p-3 text-center">

                {errore}

              </div>

            )}



            <button
              type="submit"
              disabled={caricamento}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 p-3 rounded-xl font-bold transition"
            >

              {caricamento
                ? "Accesso in corso..."
                : "🔐 Accedi"}

            </button>


          </form>


        </div>


      </div>


    </main>

  );

}