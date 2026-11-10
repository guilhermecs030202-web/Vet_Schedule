"use client";

import { useState, useEffect, useCallback } from "react";
import { AgendamentoItem, RespostaPaginada } from "@/types/agendamento";
import { Filtros } from "./Filtros";
import { TabelaAgendamentos } from "./TabelaAgendamentos";
import { FormularioAgendamento } from "./FormularioAgendamento";
import { ModalConfirmacaoCancelamento } from "./ModalConfirmacaoCancelamento";
import { Paginacao } from "./Paginacao";

export function PainelAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(6);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

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
      params.set("page", String(paginaAtual));
      params.set("limit", String(itensPorPagina));
      if (statusFiltro) params.set("status", statusFiltro);
      if (dataFiltro) params.set("data", dataFiltro);
      if (buscaClinica.trim()) params.set("busca", buscaClinica.trim());

      const url = `/api/agendamentos?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao carregar agendamentos.");
      }

      const dados: RespostaPaginada<AgendamentoItem> = await response.json();
      setAgendamentos(dados.itens);
      setTotalRegistros(dados.total);
      setTotalPaginas(dados.totalPaginas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na comunicação com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, [paginaAtual, itensPorPagina, statusFiltro, dataFiltro, buscaClinica]);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  function handleStatusChange(novoStatus: string) {
    setStatusFiltro(novoStatus);
    setPaginaAtual(1);
  }

  function handleDataChange(novaData: string) {
    setDataFiltro(novaData);
    setPaginaAtual(1);
  }

  function handleBuscaClinicaChange(novaBusca: string) {
    setBuscaClinica(novaBusca);
    setPaginaAtual(1);
  }

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
        onStatusChange={handleStatusChange}
        dataFiltro={dataFiltro}
        onDataChange={handleDataChange}
        buscaClinica={buscaClinica}
        onBuscaClinicaChange={handleBuscaClinicaChange}
        onNovoAgendamento={handleAbrirCriacao}
        totalAgendamentos={totalRegistros}
      />

      <TabelaAgendamentos
        agendamentos={agendamentos}
        carregando={carregando}
        erro={erro}
        onTentarNovamente={carregarAgendamentos}
        onEditar={handleAbrirEdicao}
        onCancelar={handleAbrirCancelamento}
        onNovoAgendamento={handleAbrirCriacao}
        paginacao={
          <Paginacao
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            itensPorPagina={itensPorPagina}
            onPaginaChange={(p) => setPaginaAtual(p)}
            onItensPorPaginaChange={(novoLimite) => {
              setItensPorPagina(novoLimite);
              setPaginaAtual(1);
            }}
          />
        }
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

