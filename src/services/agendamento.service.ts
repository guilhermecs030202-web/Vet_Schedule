import { Between, FindOptionsWhere, EntityManager } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { Agendamento, StatusAgendamento } from "@/entities/Agendamento";
import {
  agendamentoSchema,
  verificarConflitoHorario,
  INTERVALO_BLOQUEIO_MINUTOS,
} from "@/lib/validations/agendamento";

export interface FiltrosListagem {
  status?: string;
  data?: string; // Formato YYYY-MM-DD
}

export class AgendamentoService {
  /**
   * Lista agendamentos ordenados por dataColeta crescente com filtros opcionais.
   */
  static async listar(filtros: FiltrosListagem = {}): Promise<Agendamento[]> {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(Agendamento);

    const where: FindOptionsWhere<Agendamento> = {};

    if (filtros.status) {
      if (["Agendado", "Coletado", "Cancelado"].includes(filtros.status)) {
        where.status = filtros.status as StatusAgendamento;
      } else {
        throw new Error("VALIDATION_ERROR: Status inválido. Use Agendado, Coletado ou Cancelado.");
      }
    }

    if (filtros.data) {
      const regexData = /^\d{4}-\d{2}-\d{2}$/;
      if (!regexData.test(filtros.data)) {
        throw new Error("VALIDATION_ERROR: Formato de data inválido. Use YYYY-MM-DD.");
      }

      // Constrói o intervalo cobrindo o dia completo com segurança
      const partes = filtros.data.split("-").map(Number);
      const ano = partes[0];
      const mes = partes[1] - 1;
      const dia = partes[2];

      const dataInicio = new Date(ano, mes, dia, 0, 0, 0, 0);
      const dataFim = new Date(ano, mes, dia, 23, 59, 59, 999);

      if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
        throw new Error("VALIDATION_ERROR: Data fornecida é inválida.");
      }

      where.dataColeta = Between(dataInicio, dataFim);
    }

    return repo.find({
      where,
      order: {
        dataColeta: "ASC",
      },
    });
  }

  /**
   * Busca um agendamento específico pelo ID.
   */
  static async buscarPorId(id: number): Promise<Agendamento | null> {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(Agendamento);
    return repo.findOne({ where: { id } });
  }

  /**
   * Cria um agendamento executando validações e checagem de conflito com lock pessimista em transação.
   */
  static async criar(payload: unknown): Promise<Agendamento> {
    const validacao = agendamentoSchema.safeParse(payload);

    if (!validacao.success) {
      const primeiroErro = validacao.error.issues[0]?.message || "Dados de agendamento inválidos";
      throw new Error(`VALIDATION_ERROR: ${primeiroErro}`);
    }

    const dados = validacao.data;
    const dataSource = await getDataSource();

    // Executa em transação com lock pessimista para evitar condições de corrida (race conditions)
    return dataSource.transaction(async (manager: EntityManager) => {
      if (dados.status === "Agendado") {
        await this.validarConflitoComLock(dados.dataColeta, manager);
      }

      const novo = manager.create(Agendamento, {
        clinica: dados.clinica,
        animal: dados.animal,
        tipoExame: dados.tipoExame,
        dataColeta: dados.dataColeta,
        status: dados.status,
        observacoes: dados.observacoes || null,
      });

      return manager.save(novo);
    });
  }

  /**
   * Edita um agendamento existente dentro de uma transação.
   * Regras de Integridade:
   * 1. Agendamento com status "Cancelado" não pode ser reeditado.
   * 2. Agendamento com status "Coletado" não pode ter a data alterada nem ser revertido para Cancelado.
   * 3. Na checagem de conflito, o próprio registro é ignorado.
   */
  static async atualizar(id: number, payload: unknown): Promise<Agendamento> {
    const validacao = agendamentoSchema.safeParse(payload);

    if (!validacao.success) {
      const primeiroErro = validacao.error.issues[0]?.message || "Dados de agendamento inválidos";
      throw new Error(`VALIDATION_ERROR: ${primeiroErro}`);
    }

    const dados = validacao.data;
    const dataSource = await getDataSource();

    return dataSource.transaction(async (manager: EntityManager) => {
      // Bloqueia a linha existente para atualização
      const agendamento = await manager.findOne(Agendamento, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });

      if (!agendamento) {
        throw new Error("NOT_FOUND: Agendamento não encontrado.");
      }

      // Regra 1: Bloqueia reativação ou edição de agendamento cancelado
      if (agendamento.status === "Cancelado") {
        throw new Error("VALIDATION_ERROR: Não é possível editar um agendamento que se encontra cancelado.");
      }

      // Regra 2: Se já foi coletado, não permite alterar a data ou cancelar
      if (agendamento.status === "Coletado") {
        if (dados.status === "Cancelado") {
          throw new Error("VALIDATION_ERROR: Não é possível cancelar uma amostra que já foi coletada.");
        }
        if (agendamento.dataColeta.getTime() !== dados.dataColeta.getTime()) {
          throw new Error("VALIDATION_ERROR: Não é possível alterar a data/hora de uma coleta já realizada.");
        }
      }

      if (dados.status === "Agendado") {
        await this.validarConflitoComLock(dados.dataColeta, manager, id);
      }

      agendamento.clinica = dados.clinica;
      agendamento.animal = dados.animal;
      agendamento.tipoExame = dados.tipoExame;
      agendamento.dataColeta = dados.dataColeta;
      agendamento.status = dados.status;
      agendamento.observacoes = dados.observacoes || null;

      return manager.save(agendamento);
    });
  }

  /**
   * Cancela um agendamento.
   * Regras:
   * 1. Nunca remove o registro do banco.
   * 2. Bloqueia cancelamento se já estiver Cancelado.
   * 3. Bloqueia cancelamento se já estiver Coletado.
   */
  static async cancelar(id: number): Promise<Agendamento> {
    const dataSource = await getDataSource();

    return dataSource.transaction(async (manager: EntityManager) => {
      const agendamento = await manager.findOne(Agendamento, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });

      if (!agendamento) {
        throw new Error("NOT_FOUND: Agendamento não encontrado.");
      }

      if (agendamento.status === "Cancelado") {
        throw new Error("VALIDATION_ERROR: Este agendamento já se encontra cancelado.");
      }

      if (agendamento.status === "Coletado") {
        throw new Error("VALIDATION_ERROR: Não é possível cancelar uma amostra que já foi coletada.");
      }

      agendamento.status = "Cancelado";
      return manager.save(agendamento);
    });
  }

  /**
   * Busca registros concorrentes e valida a janela de 60 minutos aplicando lock pessimista de escrita.
   */
  private static async validarConflitoComLock(
    dataColeta: Date,
    manager: EntityManager,
    ignorarId?: number
  ): Promise<void> {
    const raioMs = (INTERVALO_BLOQUEIO_MINUTOS + 10) * 60 * 1000;
    const inicioJanela = new Date(dataColeta.getTime() - raioMs);
    const fimJanela = new Date(dataColeta.getTime() + raioMs);

    // Usa lock pessimista de escrita para garantir que nenhuma transação paralela insira no mesmo intervalo
    const agendamentosProximos = await manager.find(Agendamento, {
      where: {
        dataColeta: Between(inicioJanela, fimJanela),
        status: "Agendado",
      },
      lock: { mode: "pessimistic_write" },
    });

    const conflito = verificarConflitoHorario(
      dataColeta,
      agendamentosProximos.map((a) => ({
        id: a.id,
        dataColeta: a.dataColeta,
        status: a.status,
      })),
      ignorarId
    );

    if (conflito.temConflito) {
      throw new Error(`CONFLICT: ${conflito.mensagem}`);
    }
  }
}
