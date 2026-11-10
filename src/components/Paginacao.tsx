"use client";

interface PaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  itensPorPagina: number;
  onPaginaChange: (pagina: number) => void;
  onItensPorPaginaChange?: (itens: number) => void;
}

export function Paginacao({
  paginaAtual,
  totalPaginas,
  totalRegistros,
  itensPorPagina,
  onPaginaChange,
  onItensPorPaginaChange,
}: PaginacaoProps) {
  if (totalRegistros === 0) return null;

  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalRegistros);

  // Gera a lista de páginas para exibição com elipses quando houver muitas páginas
  function gerarNumerosPaginas(): (number | string)[] {
    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }

    const paginas: (number | string)[] = [];
    paginas.push(1);

    if (paginaAtual > 3) {
      paginas.push("...");
    }

    const inicioJanela = Math.max(2, paginaAtual - 1);
    const fimJanela = Math.min(totalPaginas - 1, paginaAtual + 1);

    for (let p = inicioJanela; p <= fimJanela; p++) {
      paginas.push(p);
    }

    if (paginaAtual < totalPaginas - 2) {
      paginas.push("...");
    }

    paginas.push(totalPaginas);
    return paginas;
  }

  const paginasParaExibir = gerarNumerosPaginas();

  return (
    <div className="bg-white px-4 py-3 sm:px-6 rounded-b-xl border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
      {/* Resumo e Seletor de Itens */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>
          Exibindo <strong className="text-slate-900 font-semibold">{inicio}</strong> a{" "}
          <strong className="text-slate-900 font-semibold">{fim}</strong> de{" "}
          <strong className="text-slate-900 font-semibold">{totalRegistros}</strong> coletas
        </span>

        {onItensPorPaginaChange && (
          <div className="hidden sm:inline-flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-slate-500">Por página:</span>
            <select
              value={itensPorPagina}
              onChange={(e) => onItensPorPaginaChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="inline-flex items-center gap-1">
        {/* Botão Anterior */}
        <button
          onClick={() => onPaginaChange(paginaAtual - 1)}
          disabled={paginaAtual <= 1}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            paginaAtual <= 1
              ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
          }`}
          title="Página anterior"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números das Páginas */}
        <div className="hidden sm:inline-flex items-center gap-1">
          {paginasParaExibir.map((item, index) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-xs text-slate-400 select-none"
                >
                  ...
                </span>
              );
            }

            const num = Number(item);
            const ativo = num === paginaAtual;

            return (
              <button
                key={num}
                onClick={() => onPaginaChange(num)}
                className={`min-w-8 h-8 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  ativo
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Exibição simples no mobile */}
        <span className="sm:hidden text-xs font-medium text-slate-600 px-2">
          Pág. {paginaAtual} de {totalPaginas}
        </span>

        {/* Botão Próxima */}
        <button
          onClick={() => onPaginaChange(paginaAtual + 1)}
          disabled={paginaAtual >= totalPaginas}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            paginaAtual >= totalPaginas
              ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
          }`}
          title="Próxima página"
        >
          <span className="hidden sm:inline">Próxima</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

