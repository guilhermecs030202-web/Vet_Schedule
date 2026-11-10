"use client";

import { useState, useEffect, FormEvent } from "react";
import { AgendamentoItem, StatusAgendamento } from "@/types/agendamento";

interface FormularioAgendamentoProps {
  agendamentoParaEditar?: AgendamentoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSalvo: () => void;
}

const OPCOES_EXAME_PADRAO = [
  "Hemograma",
  "Bioquímico",
  "Cultura",
  "Urinálise",
  "Parasitológico",
  "Outro",
];

export function FormularioAgendamento({
  agendamentoParaEditar,
  isOpen,
  onClose,
  onSalvo,
}: FormularioAgendamentoProps) {
  const isEdicao = !!agendamentoParaEditar;

  const [clinica, setClinica] = useState("");
  const [animal, setAnimal] = useState("");
  const [tipoExameSelect, setTipoExameSelect] = useState("Hemograma");
  const [outroExame, setOutroExame] = useState("");
  const [dataColeta, setDataColeta] = useState("");
  const [status, setStatus] = useState<StatusAgendamento>("Agendado");
  const [observacoes, setObservacoes] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Preenche ou reseta o formulário ao abrir
  useEffect(() => {
    if (!isOpen) return;

    setErrosCampo({});
    setErroGeral(null);

    if (agendamentoParaEditar) {
      setClinica(agendamentoParaEditar.clinica);
      setAnimal(agendamentoParaEditar.animal);

      if (OPCOES_EXAME_PADRAO.includes(agendamentoParaEditar.tipoExame)) {
        setTipoExameSelect(agendamentoParaEditar.tipoExame);
        setOutroExame("");
      } else {
        setTipoExameSelect("Outro");
        setOutroExame(agendamentoParaEditar.tipoExame);
      }

      // Converte ISO datetime para formato esperado pelo input datetime-local (YYYY-MM-DDTHH:mm)
      try {
        const d = new Date(agendamentoParaEditar.dataColeta);
        const pad = (n: number) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDataColeta(formatted);
      } catch {
        setDataColeta("");
      }

      setStatus(agendamentoParaEditar.status);
      setObservacoes(agendamentoParaEditar.observacoes || "");
    } else {
      // Valores padrão para criação
      setClinica("");
      setAnimal("");
      setTipoExameSelect("Hemograma");
      setOutroExame("");
      setDataColeta("");
      setStatus("Agendado");
      setObservacoes("");
    }
  }, [agendamentoParaEditar, isOpen]);

  if (!isOpen) return null;

  // Data mínima para bloqueio no passado: agora
  const agoraMin = new Date().toISOString().slice(0, 16);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrosCampo({});
    setErroGeral(null);

    const tipoExameFinal = tipoExameSelect === "Outro" ? outroExame.trim() : tipoExameSelect;

    // Validações locais imediatas
    const novosErros: Record<string, string> = {};
    if (!clinica.trim()) novosErros.clinica = "Clínica é obrigatória";
    if (!animal.trim()) novosErros.animal = "Animal é obrigatório";
    if (!tipoExameFinal) novosErros.tipoExame = "Tipo de exame é obrigatório";
    if (!dataColeta) {
      novosErros.dataColeta = "Data e hora da coleta são obrigatórias";
    } else {
      const dataEscolhida = new Date(dataColeta);
      if (isNaN(dataEscolhida.getTime())) {
        novosErros.dataColeta = "Data e hora inválidas";
      } else if (!isEdicao && dataEscolhida.getTime() < Date.now()) {
        novosErros.dataColeta = "Data da coleta não pode estar no passado";
      } else if (isEdicao && agendamentoParaEditar) {
        const dataOriginal = new Date(agendamentoParaEditar.dataColeta).getTime();
        if (dataEscolhida.getTime() !== dataOriginal && dataEscolhida.getTime() < Date.now()) {
          novosErros.dataColeta = "A nova data da coleta não pode estar no passado";
        }
      }
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosCampo(novosErros);
      return;
    }

    setEnviando(true);

    try {
      const payload = {
        clinica: clinica.trim(),
        animal: animal.trim(),
        tipoExame: tipoExameFinal,
        dataColeta: new Date(dataColeta).toISOString(),
        status,
        observacoes: observacoes.trim() || null,
      };

      const url = isEdicao
        ? `/api/agendamentos/${agendamentoParaEditar.id}`
        : "/api/agendamentos";
      const method = isEdicao ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Se a API retornou erro de conflito (409) ou validação (400)
        setErroGeral(data.error || "Ocorreu um erro ao salvar o agendamento.");
        return;
      }

      onSalvo();
      onClose();
    } catch {
      setErroGeral("Falha na conexão com o servidor. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">
            {isEdicao ? "Editar Agendamento de Coleta" : "Novo Agendamento de Coleta"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            title="Fechar"
            disabled={enviando}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerta de Erro Geral ou Conflito de Horário */}
        {erroGeral && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Atenção:</p>
              <p>{erroGeral}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Clínica */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Clínica Veterinária *
            </label>
            <input
              type="text"
              required
              value={clinica}
              onChange={(e) => setClinica(e.target.value)}
              placeholder="Ex: Clínica PetCare, Hospital São Francisco"
              disabled={enviando}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-900 ${
                errosCampo.clinica
                  ? "border-red-300 focus:ring-red-400"
                  : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
              }`}
            />
            {errosCampo.clinica && (
              <p className="text-xs text-red-600 mt-1">{errosCampo.clinica}</p>
            )}
          </div>

          {/* Animal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Animal / Paciente *
            </label>
            <input
              type="text"
              required
              value={animal}
              onChange={(e) => setAnimal(e.target.value)}
              placeholder="Ex: Thor (Canino, Golden Retriever)"
              disabled={enviando}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-900 ${
                errosCampo.animal
                  ? "border-red-300 focus:ring-red-400"
                  : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
              }`}
            />
            {errosCampo.animal && (
              <p className="text-xs text-red-600 mt-1">{errosCampo.animal}</p>
            )}
          </div>

          {/* Tipo de Exame */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tipo de Exame *
            </label>
            <select
              value={tipoExameSelect}
              onChange={(e) => setTipoExameSelect(e.target.value)}
              disabled={enviando}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white"
            >
              {OPCOES_EXAME_PADRAO.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {tipoExameSelect === "Outro" && (
              <div className="mt-2">
                <input
                  type="text"
                  required
                  value={outroExame}
                  onChange={(e) => setOutroExame(e.target.value)}
                  placeholder="Especifique o tipo de exame..."
                  disabled={enviando}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-900 ${
                    errosCampo.tipoExame
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:ring-emerald-500"
                  }`}
                />
              </div>
            )}
            {errosCampo.tipoExame && (
              <p className="text-xs text-red-600 mt-1">{errosCampo.tipoExame}</p>
            )}
          </div>

          {/* Data e Hora da Coleta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Data e Hora da Coleta *
            </label>
            <input
              type="datetime-local"
              required
              min={!isEdicao ? agoraMin : undefined}
              value={dataColeta}
              onChange={(e) => setDataColeta(e.target.value)}
              disabled={enviando}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 text-slate-900 ${
                errosCampo.dataColeta
                  ? "border-red-300 focus:ring-red-400"
                  : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
              }`}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * Bloqueia outro agendamento com status Agendado marcado para o mesmo horário.
            </p>
            {errosCampo.dataColeta && (
              <p className="text-xs text-red-600 mt-1">{errosCampo.dataColeta}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Status da Coleta
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusAgendamento)}
              disabled={enviando}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white"
            >
              <option value="Agendado">Agendado</option>
              <option value="Coletado">Coletado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Amostra refrigerada, jejum prévio..."
              disabled={enviando}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60"
            >
              {enviando && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{isEdicao ? "Salvar Alterações" : "Criar Agendamento"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

