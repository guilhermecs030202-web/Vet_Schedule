import { redirect } from "next/navigation";
import { obterSessaoServidor } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { PainelAgendamentos } from "@/components/PainelAgendamentos";

export const dynamic = "force-dynamic";

export default async function AgendamentosPage() {
  const sessao = await obterSessaoServidor();

  if (!sessao) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar usuarioEmail={sessao.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PainelAgendamentos />
      </main>
    </div>
  );
}

