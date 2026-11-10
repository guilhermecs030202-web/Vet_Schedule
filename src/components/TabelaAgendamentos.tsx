"use client";

import { AgendamentoItem } from "@/types/agendamento";
import { StatusBadge } from "./StatusBadge";

interface TabelaAgendamentosProps {
  agendamentos: AgendamentoItem[];
  carregando: boolean;
  erro: string | null;
  onTentarNovamente: () => void;
  onEditar: (agendamento: AgendamentoItem) => void;
  onCancelar: (agendamento: AgendamentoItem) => void;
  onNovoAgendamento: () => void;
}

export function TabelaAgendamentos({
  agendamentos,
  carregando,
  erro,
  onTentarNovamente,
  onEditar,
  onCancelar,
  onNovoAgendamento,
}: TabelaAgendamentosProps) {
  function formatarDataHora(isoString: string): string {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return "Data inválida";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data);
  }

  // Estado de Carregamento (Skeletons)
  if (carregando) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0"
          >
            <div className="space-y-2 w-full sm:w-1/3">
              <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Estado de Erro
  if (erro) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center my-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-3">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Não foi possível carregar os agendamentos
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">{erro}</p>
        <button
          onClick={onTentarNovamente}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Tentar novamente
        </button>
      </div>
    );
  }

  // Estado de Lista Vazia
  if (agendamentos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center my-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4 text-2xl">
          📋
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Nenhum agendamento encontrado
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          Não encontramos coletas com os filtros selecionados ou ainda não há agendamentos cadastrados.
        </p>
        <button
          onClick={onNovoAgendamento}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <span>+ Criar novo agendamento</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Visualização Desktop (Tabela) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th scope="col" className="px-5 py-3.5">Data e Hora</th>
              <th scope="col" className="px-5 py-3.5">Clínica Veterinária</th>
              <th scope="col" className="px-5 py-3.5">Animal / Paciente</th>
              <th scope="col" className="px-5 py-3.5">Exame Solicitado</th>
              <th scope="col" className="px-5 py-3.5">Status</th>
              <th scope="col" className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agendamentos.map((item) => {
              const estaCancelado = item.status === "Cancelado";

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    estaCancelado ? "opacity-75 bg-slate-50/30" : ""
                  }`}
                >
                  <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">📅</span>
                      <span>{formatarDataHora(item.dataColeta)}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {item.clinica}
                    {item.observacoes && (
                      <p className="text-xs font-normal text-slate-500 mt-0.5 line-clamp-1 italic" title={item.observacoes}>
                        Obs: {item.observacoes}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                    {item.animal}
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800">
                      {item.tipoExame}
                    </span>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onEditar(item)}
                        disabled={estaCancelado}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          estaCancelado
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "text-slate-700 bg-white hover:bg-slate-100 border border-slate-300"
                        }`}
                        title={estaCancelado ? "Agendamento cancelado não pode ser editado" : "Editar agendamento"}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => onCancelar(item)}
                        disabled={estaCancelado || item.status === "Coletado"}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          estaCancelado || item.status === "Coletado"
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-white text-red-600 hover:bg-red-50 border border-red-200"
                        }`}
                        title={
                          estaCancelado
                            ? "Este agendamento já está cancelado"
                            : item.status === "Coletado"
                            ? "Amostra já coletada não pode ser cancelada"
                            : "Cancelar coleta"
                        }
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visualização Mobile (Cards) */}
      <div className="md:hidden divide-y divide-slate-100">
        {agendamentos.map((item) => {
          const estaCancelado = item.status === "Cancelado";

          return (
            <div
              key={item.id}
              className={`p-4 space-y-3 ${
                estaCancelado ? "opacity-75 bg-slate-50/50" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                  <span>📅</span> {formatarDataHora(item.dataColeta)}
                </span>
                <StatusBadge status={item.status} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">{item.clinica}</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-medium text-slate-800">Animal:</span> {item.animal}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-medium text-slate-800">Exame:</span> {item.tipoExame}
                </p>
                {item.observacoes && (
                  <p className="text-xs text-slate-500 mt-1 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                    Obs: {item.observacoes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onEditar(item)}
                  disabled={estaCancelado}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    estaCancelado
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "text-slate-700 bg-white hover:bg-slate-100 border border-slate-300"
                  }`}
                >
                  Editar
                </button>
                <button
                  onClick={() => onCancelar(item)}
                  disabled={estaCancelado || item.status === "Coletado"}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    estaCancelado || item.status === "Coletado"
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-white text-red-600 hover:bg-red-50 border border-red-200"
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

