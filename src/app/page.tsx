import { redirect } from "next/navigation";
import { obterSessaoServidor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessao = await obterSessaoServidor();

  if (!sessao) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <h1 className="text-xl font-bold text-slate-900">VetSchedule</h1>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full ml-2">
            Recepção
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Logado como: <strong className="text-slate-900">{sessao.email}</strong>
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-300 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Bem-vindo(a) à Agenda de Coletas Veterinárias!
          </h2>
          <p className="text-slate-600 mb-6">
            Autenticação concluída e sessão ativa (expiração de 8h).
          </p>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm inline-block">
            ✅ <strong>Status da Autenticação:</strong> Conectado com sucesso via Cookie HttpOnly e JWT assinado com <code>jose</code>.
          </div>
        </div>
      </main>
    </div>
  );
}
