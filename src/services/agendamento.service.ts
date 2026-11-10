import { Between, FindOptionsWhere } from "typeorm";
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

      // Considera o dia inteiro: das 00:00:00.000 às 23:59:59.999
      const dataInicio = new Date(`${filtros.data}T00:00:00.000`);
      const dataFim = new Date(`${filtros.data}T23:59:59.999`);

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
   * Cria um agendamento executando validações e checagem de conflito dentro de uma transação.
   */
  static async criar(payload: unknown): Promise<Agendamento> {
    const validacao = agendamentoSchema.safeParse(payload);

    if (!validacao.success) {
      const primeiroErro = validacao.error.issues[0]?.message || "Dados de agendamento inválidos";
      throw new Error(`VALIDATION_ERROR: ${primeiroErro}`);
    }

    const dados = validacao.data;
    const dataSource = await getDataSource();

    // Executa verificação e gravação em uma transação atômica
    return dataSource.transaction(async (manager) => {
      if (dados.status === "Agendado") {
        const raioMs = (INTERVALO_BLOQUEIO_MINUTOS + 10) * 60 * 1000;
        const inicioJanela = new Date(dados.dataColeta.getTime() - raioMs);
        const fimJanela = new Date(dados.dataColeta.getTime() + raioMs);

        // Busca registros concorrentes dentro da janela de tempo
        const agendamentosProximos = await manager.find(Agendamento, {
          where: {
            dataColeta: Between(inicioJanela, fimJanela),
            status: "Agendado",
          },
        });

        const conflito = verificarConflitoHorario(
          dados.dataColeta,
          agendamentosProximos.map((a) => ({
            id: a.id,
            dataColeta: a.dataColeta,
            status: a.status,
          }))
        );

        if (conflito.temConflito) {
          throw new Error(`CONFLICT: ${conflito.mensagem}`);
        }
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
   * Na checagem de conflito de horário, ignora o próprio registro.
   */
  static async atualizar(id: number, payload: unknown): Promise<Agendamento> {
    const validacao = agendamentoSchema.safeParse(payload);

    if (!validacao.success) {
      const primeiroErro = validacao.error.issues[0]?.message || "Dados de agendamento inválidos";
      throw new Error(`VALIDATION_ERROR: ${primeiroErro}`);
    }

    const dados = validacao.data;
    const dataSource = await getDataSource();

    return dataSource.transaction(async (manager) => {
      const agendamento = await manager.findOne(Agendamento, { where: { id } });

      if (!agendamento) {
        throw new Error("NOT_FOUND: Agendamento não encontrado.");
      }

      if (dados.status === "Agendado") {
        const raioMs = (INTERVALO_BLOQUEIO_MINUTOS + 10) * 60 * 1000;
        const inicioJanela = new Date(dados.dataColeta.getTime() - raioMs);
        const fimJanela = new Date(dados.dataColeta.getTime() + raioMs);

        const agendamentosProximos = await manager.find(Agendamento, {
          where: {
            dataColeta: Between(inicioJanela, fimJanela),
            status: "Agendado",
          },
        });

        // Ignora o próprio ID na verificação
        const conflito = verificarConflitoHorario(
          dados.dataColeta,
          agendamentosProximos.map((a) => ({
            id: a.id,
            dataColeta: a.dataColeta,
            status: a.status,
          })),
          id
        );

        if (conflito.temConflito) {
          throw new Error(`CONFLICT: ${conflito.mensagem}`);
        }
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
   * 2. Não deve ser possível cancelar o que já está Cancelado.
   */
  static async cancelar(id: number): Promise<Agendamento> {
    const dataSource = await getDataSource();

    return dataSource.transaction(async (manager) => {
      const agendamento = await manager.findOne(Agendamento, { where: { id } });

      if (!agendamento) {
        throw new Error("NOT_FOUND: Agendamento não encontrado.");
      }

      if (agendamento.status === "Cancelado") {
        throw new Error("VALIDATION_ERROR: Este agendamento já se encontra cancelado.");
      }

      agendamento.status = "Cancelado";
      return manager.save(agendamento);
    });
  }
}
