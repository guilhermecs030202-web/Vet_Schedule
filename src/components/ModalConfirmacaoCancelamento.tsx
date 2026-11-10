"use client";

import { useState } from "react";
import { AgendamentoItem } from "@/types/agendamento";

interface ModalConfirmacaoCancelamentoProps {
  agendamento: AgendamentoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmado: () => void;
}

export function ModalConfirmacaoCancelamento({
  agendamento,
  isOpen,
  onClose,
  onConfirmado,
}: ModalConfirmacaoCancelamentoProps) {
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen || !agendamento) return null;

  async function handleConfirmar() {
    setCancelando(true);
    setErro(null);

    try {
      const response = await fetch(`/api/agendamentos/${agendamento!.id}/cancelar`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Não foi possível cancelar o agendamento.");
        return;
      }

      onConfirmado();
      onClose();
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Confirmar Cancelamento de Coleta
          </h3>

          <p className="text-sm text-slate-600 mb-4">
            Tem certeza de que deseja cancelar o agendamento da clínica{" "}
            <strong className="text-slate-800">{agendamento.clinica}</strong> para o animal{" "}
            <strong className="text-slate-800">{agendamento.animal}</strong>?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-4">
            ⚠️ <strong>Atenção:</strong> O status será alterado para <em>Cancelado</em>. O registro continuará salvo no histórico e não poderá ser cancelado novamente.
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-4">
              {erro}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={cancelando}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={cancelando}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60"
            >
              {cancelando && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{cancelando ? "Cancelando..." : "Sim, Cancelar Coleta"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

