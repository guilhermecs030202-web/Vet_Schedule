import { Between, FindOptionsWhere, EntityManager, In, Like } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { Agendamento, StatusAgendamento } from "@/entities/Agendamento";
import {
  agendamentoSchema,
  verificarConflitoHorario,
} from "@/lib/validations/agendamento";

export interface FiltrosListagem {
  status?: string;
  data?: string; // Formato YYYY-MM-DD
  busca?: string; // Busca textual por clínica
}

export interface FiltrosPaginacao extends FiltrosListagem {
  pagina?: number;
  limite?: number;
}

export interface ResultadoPaginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
  limite: number;
}

export class AgendamentoService {
  /**
   * Constrói a cláusula WHERE a partir dos filtros fornecidos.
   */
  private static construirWhere(filtros: FiltrosListagem): FindOptionsWhere<Agendamento> {
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

      // Constrói o intervalo cobrindo o dia completo
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

    if (filtros.busca && filtros.busca.trim().length > 0) {
      where.clinica = Like(`%${filtros.busca.trim()}%`);
    }

    return where;
  }

  /**
   * Lista agendamentos ordenados por dataColeta crescente com filtros opcionais.
   */
  static async listar(filtros: FiltrosListagem = {}): Promise<Agendamento[]> {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(Agendamento);
    const where = this.construirWhere(filtros);

    return repo.find({
      where,
      order: {
        dataColeta: "ASC",
      },
    });
  }

  /**
   * Lista agendamentos com paginação no banco de dados e contagem total de registros.
   */
  static async listarPaginado(
    filtros: FiltrosPaginacao = {}
  ): Promise<ResultadoPaginado<Agendamento>> {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(Agendamento);

    const pagina = Math.max(1, filtros.pagina || 1);
    const limite = Math.max(1, Math.min(50, filtros.limite || 6));
    const skip = (pagina - 1) * limite;
    const where = this.construirWhere(filtros);

    const [itens, total] = await repo.findAndCount({
      where,
      order: {
        dataColeta: "ASC",
      },
      skip,
      take: limite,
    });

    const totalPaginas = Math.ceil(total / limite) || 1;

    return {
      itens,
      total,
      pagina,
      totalPaginas,
      limite,
    };
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
   * Cria um agendamento executando validações e checagem de conflito no mesmo horário.
   * Regra do edital: dois agendamentos com status Agendado no mesmo horário bloqueados.
   */
  static async criar(payload: unknown): Promise<Agendamento> {
    const validacao = agendamentoSchema.safeParse(payload);

    if (!validacao.success) {
      const primeiroErro = validacao.error.issues[0]?.message || "Dados de agendamento inválidos";
      throw new Error(`VALIDATION_ERROR: ${primeiroErro}`);
    }

    const dados = validacao.data;
    const dataSource = await getDataSource();

    // Executa em transação com lock pessimista para evitar concorrência
    return dataSource.transaction(async (manager: EntityManager) => {
      if (dados.status === "Agendado") {
        await this.validarConflitoMesmoHorario(dados.dataColeta, manager);
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
   * Regras:
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
      const agendamento = await manager.findOne(Agendamento, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });

      if (!agendamento) {
        throw new Error("NOT_FOUND: Agendamento não encontrado.");
      }

      if (agendamento.status === "Cancelado") {
        throw new Error("VALIDATION_ERROR: Não é possível editar um agendamento que se encontra cancelado.");
      }

      if (agendamento.status === "Coletado") {
        if (dados.status === "Cancelado") {
          throw new Error("VALIDATION_ERROR: Não é possível cancelar uma amostra que já foi coletada.");
        }
        if (agendamento.dataColeta.getTime() !== dados.dataColeta.getTime()) {
          throw new Error("VALIDATION_ERROR: Não é possível alterar a data/hora de uma coleta já realizada.");
        }
      }

      if (dados.status === "Agendado") {
        await this.validarConflitoMesmoHorario(dados.dataColeta, manager, id);
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
   * Regras do edital:
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
   * Valida se já existe outro agendamento no mesmo horário exato (mesmo minuto) com lock pessimista.
   */
  private static async validarConflitoMesmoHorario(
    dataColeta: Date,
    manager: EntityManager,
    ignorarId?: number
  ): Promise<void> {
    const inicioMinuto = new Date(Math.floor(dataColeta.getTime() / 60000) * 60000);
    const fimMinuto = new Date(inicioMinuto.getTime() + 59999);

    const agendamentosNoMesmoMinuto = await manager.find(Agendamento, {
      where: {
        dataColeta: Between(inicioMinuto, fimMinuto),
        status: "Agendado",
      },
      lock: { mode: "pessimistic_write" },
    });

    const conflito = verificarConflitoHorario(
      dataColeta,
      agendamentosNoMesmoMinuto.map((a) => ({
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
