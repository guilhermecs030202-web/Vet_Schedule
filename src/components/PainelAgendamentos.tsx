"use client";

import { useState, useEffect, useCallback } from "react";
import { AgendamentoItem } from "@/types/agendamento";
import { Filtros } from "./Filtros";
import { TabelaAgendamentos } from "./TabelaAgendamentos";
import { FormularioAgendamento } from "./FormularioAgendamento";
import { ModalConfirmacaoCancelamento } from "./ModalConfirmacaoCancelamento";

export function PainelAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");
  const [buscaClinica, setBuscaClinica] = useState("");

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<AgendamentoItem | null>(null);
  const [itemParaCancelar, setItemParaCancelar] = useState<AgendamentoItem | null>(null);

  const carregarAgendamentos = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams();
      if (statusFiltro) params.set("status", statusFiltro);
      if (dataFiltro) params.set("data", dataFiltro);

      const url = `/api/agendamentos${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao carregar agendamentos.");
      }

      const dados: AgendamentoItem[] = await response.json();
      setAgendamentos(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na comunicação com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, [statusFiltro, dataFiltro]);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  // Filtro local adicional de busca textual por Clínica (diferencial)
  const agendamentosFiltrados = agendamentos.filter((item) => {
    if (!buscaClinica.trim()) return true;
    return item.clinica.toLowerCase().includes(buscaClinica.toLowerCase().trim());
  });

  function handleAbrirCriacao() {
    setItemParaEditar(null);
    setModalFormAberto(true);
  }

  function handleAbrirEdicao(item: AgendamentoItem) {
    setItemParaEditar(item);
    setModalFormAberto(true);
  }

  function handleAbrirCancelamento(item: AgendamentoItem) {
    setItemParaCancelar(item);
  }

  return (
    <>
      <Filtros
        statusFiltro={statusFiltro}
        onStatusChange={setStatusFiltro}
        dataFiltro={dataFiltro}
        onDataChange={setDataFiltro}
        buscaClinica={buscaClinica}
        onBuscaClinicaChange={setBuscaClinica}
        onNovoAgendamento={handleAbrirCriacao}
        totalAgendamentos={agendamentosFiltrados.length}
      />

      <TabelaAgendamentos
        agendamentos={agendamentosFiltrados}
        carregando={carregando}
        erro={erro}
        onTentarNovamente={carregarAgendamentos}
        onEditar={handleAbrirEdicao}
        onCancelar={handleAbrirCancelamento}
        onNovoAgendamento={handleAbrirCriacao}
      />

      <FormularioAgendamento
        isOpen={modalFormAberto}
        agendamentoParaEditar={itemParaEditar}
        onClose={() => setModalFormAberto(false)}
        onSalvo={carregarAgendamentos}
      />

      <ModalConfirmacaoCancelamento
        isOpen={!!itemParaCancelar}
        agendamento={itemParaCancelar}
        onClose={() => setItemParaCancelar(null)}
        onConfirmado={carregarAgendamentos}
      />
    </>
  );
}

