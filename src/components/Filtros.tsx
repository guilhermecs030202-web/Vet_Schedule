"use client";

interface FiltrosProps {
  statusFiltro: string;
  onStatusChange: (status: string) => void;
  dataFiltro: string;
  onDataChange: (data: string) => void;
  buscaClinica: string;
  onBuscaClinicaChange: (busca: string) => void;
  onNovoAgendamento: () => void;
  totalAgendamentos: number;
}

export function Filtros({
  statusFiltro,
  onStatusChange,
  dataFiltro,
  onDataChange,
  buscaClinica,
  onBuscaClinicaChange,
  onNovoAgendamento,
  totalAgendamentos,
}: FiltrosProps) {
  const opcoesStatus = [
    { label: "Todos", value: "" },
    { label: "Agendado", value: "Agendado" },
    { label: "Coletado", value: "Coletado" },
    { label: "Cancelado", value: "Cancelado" },
  ];

  function definirHoje() {
    const hoje = new Date().toISOString().split("T")[0];
    onDataChange(hoje);
  }

  function limparData() {
    onDataChange("");
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Agenda de Coletas de Amostras
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total de {totalAgendamentos} {totalAgendamentos === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>

        <button
          onClick={onNovoAgendamento}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Nova Coleta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
        {/* Filtro de Status em Abas/Botões */}
        <div className="lg:col-span-5">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Filtrar por Status
          </label>
          <div className="inline-flex w-full bg-slate-100 p-1 rounded-lg border border-slate-200">
            {opcoesStatus.map((opcao) => {
              const ativo = statusFiltro === opcao.value;
              return (
                <button
                  key={opcao.value}
                  onClick={() => onStatusChange(opcao.value)}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all text-center ${
                    ativo
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opcao.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro por Data */}
        <div className="lg:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Filtrar por Data da Coleta
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => onDataChange(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={definirHoje}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              title="Filtrar coletas de hoje"
            >
              Hoje
            </button>
            {dataFiltro && (
              <button
                type="button"
                onClick={limparData}
                className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                title="Limpar filtro de data"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Busca por Clínica */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Buscar por Clínica
          </label>
          <div className="relative">
            <input
              type="text"
              value={buscaClinica}
              onChange={(e) => onBuscaClinicaChange(e.target.value)}
              placeholder="Ex: PetCare, São Francisco..."
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-400"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

