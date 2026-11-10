import { describe, it, expect } from "vitest";
import {
  criarAgendamentoSchema,
  verificarConflitoHorario,
  AgendamentoParaConflito,
} from "./agendamento";

describe("Validação de Agendamento (Zod Schema)", () => {
  const agoraFixo = new Date("2026-11-10T12:00:00.000Z");
  const schema = criarAgendamentoSchema(agoraFixo);

  const payloadValido = {
    clinica: "Clínica Vet Vida",
    animal: "Rex",
    tipoExame: "Hemograma completo",
    dataColeta: new Date("2026-11-10T15:00:00.000Z"),
    status: "Agendado" as const,
    observacoes: "Animal em jejum há 8 horas",
  };

  it("deve aceitar um payload válido com data futura", () => {
    const resultado = schema.safeParse(payloadValido);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.clinica).toBe("Clínica Vet Vida");
      expect(resultado.data.status).toBe("Agendado");
      expect(resultado.data.dataColeta).toBeInstanceOf(Date);
    }
  });

  it("deve atribuir o status 'Agendado' por padrão se omitido", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status, ...semStatus } = payloadValido;
    const resultado = schema.safeParse(semStatus);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.status).toBe("Agendado");
    }
  });

  it("deve rejeitar quando clinica for vazia ou apenas com espaços em branco", () => {
    const comEspacos = { ...payloadValido, clinica: "     " };
    const vazia = { ...payloadValido, clinica: "" };

    const resEspacos = schema.safeParse(comEspacos);
    const resVazia = schema.safeParse(vazia);

    expect(resEspacos.success).toBe(false);
    expect(resVazia.success).toBe(false);
  });

  it("deve rejeitar quando animal for vazio ou apenas com espaços em branco", () => {
    const comEspacos = { ...payloadValido, animal: "   " };
    const res = schema.safeParse(comEspacos);
    expect(res.success).toBe(false);
  });

  it("deve rejeitar quando tipoExame for vazio ou apenas com espaços em branco", () => {
    const comEspacos = { ...payloadValido, tipoExame: " \t  " };
    const res = schema.safeParse(comEspacos);
    expect(res.success).toBe(false);
  });

  it("deve rejeitar quando dataColeta estiver no passado em relação à referência", () => {
    const dataPassada = new Date("2026-11-10T11:59:59.000Z"); // 1 segundo antes de agoraFixo
    const res = schema.safeParse({
      ...payloadValido,
      dataColeta: dataPassada,
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      const erros = res.error.issues.map((i) => i.message);
      expect(erros).toContain("Data da coleta não pode estar no passado");
    }
  });

  it("deve aceitar datas no formato de string ISO válida que estejam no futuro", () => {
    const res = schema.safeParse({
      ...payloadValido,
      dataColeta: "2026-11-10T16:00:00.000Z",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dataColeta).toBeInstanceOf(Date);
    }
  });

  it("deve rejeitar status inválido", () => {
    const statusInvalido = {
      ...payloadValido,
      status: "Finalizado",
    };

    const res = schema.safeParse(statusInvalido);
    expect(res.success).toBe(false);
  });

  it("deve aceitar os três status válidos: Agendado, Coletado, Cancelado", () => {
    for (const st of ["Agendado", "Coletado", "Cancelado"] as const) {
      const res = schema.safeParse({
        ...payloadValido,
        status: st,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe(st);
      }
    }
  });

  it("deve suportar função dinâmica para data de referência (evitando congelar no boot do servidor)", () => {
    let tempoDinamico = new Date("2026-11-10T12:00:00.000Z");
    const schemaDinamico = criarAgendamentoSchema(() => tempoDinamico);

    // Às 12:00, uma data às 12:30 é válida
    const resValido = schemaDinamico.safeParse({
      ...payloadValido,
      dataColeta: new Date("2026-11-10T12:30:00.000Z"),
    });
    expect(resValido.success).toBe(true);

    // Avança o relógio dinâmico para 13:00
    tempoDinamico = new Date("2026-11-10T13:00:00.000Z");

    // Agora, a mesma data de 12:30 deve ser rejeitada como passado!
    const resInvalido = schemaDinamico.safeParse({
      ...payloadValido,
      dataColeta: new Date("2026-11-10T12:30:00.000Z"),
    });
    expect(resInvalido.success).toBe(false);
    if (!resInvalido.success) {
      expect(resInvalido.error.issues[0].message).toBe("Data da coleta não pode estar no passado");
    }
  });
});

describe("Verificação de Conflito de Horário (Regra do Edital: mesmo horário)", () => {
  const baseData = new Date("2026-11-11T14:00:00.000Z");

  const agendamentoExistente: AgendamentoParaConflito = {
    id: 1,
    dataColeta: baseData, // 14:00
    status: "Agendado",
  };

  it("deve detectar conflito para o mesmo horário exato (mesmo minuto)", () => {
    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:00:00.000Z"),
      [agendamentoExistente]
    );

    expect(resultado.temConflito).toBe(true);
    expect(resultado.conflitoCom?.id).toBe(1);
  });

  it("NÃO deve detectar conflito quando o novo horário for em minuto diferente (ex.: 14:30)", () => {
    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:30:00.000Z"),
      [agendamentoExistente]
    );

    expect(resultado.temConflito).toBe(false);
  });

  it("NÃO deve detectar conflito quando o novo horário for 1 minuto diferente (ex.: 14:01)", () => {
    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:01:00.000Z"),
      [agendamentoExistente]
    );

    expect(resultado.temConflito).toBe(false);
  });

  it("NÃO deve detectar conflito se o agendamento no mesmo horário estiver 'Cancelado'", () => {
    const agendamentoCancelado: AgendamentoParaConflito = {
      id: 2,
      dataColeta: baseData,
      status: "Cancelado",
    };

    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:00:00.000Z"),
      [agendamentoCancelado]
    );

    expect(resultado.temConflito).toBe(false);
  });

  it("NÃO deve detectar conflito se o agendamento no mesmo horário estiver 'Coletado'", () => {
    const agendamentoColetado: AgendamentoParaConflito = {
      id: 3,
      dataColeta: baseData,
      status: "Coletado",
    };

    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:00:00.000Z"),
      [agendamentoColetado]
    );

    expect(resultado.temConflito).toBe(false);
  });

  it("na EDIÇÃO: NÃO deve gerar conflito quando o agendamento no mesmo horário for o próprio registro que está sendo editado", () => {
    // Editando o agendamento id: 1 mantendo o mesmo horário
    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T14:00:00.000Z"),
      [agendamentoExistente],
      1 // agendamentoAtualId
    );

    expect(resultado.temConflito).toBe(false);
  });

  it("na EDIÇÃO: DEVE gerar conflito quando colidir com OUTRO registro diferente no mesmo horário", () => {
    const outroAgendamento: AgendamentoParaConflito = {
      id: 99,
      dataColeta: new Date("2026-11-11T16:00:00.000Z"),
      status: "Agendado",
    };

    // Editando o id: 1, mas tentando alterar para o mesmo horário do id: 99 (16:00)
    const resultado = verificarConflitoHorario(
      new Date("2026-11-11T16:00:00.000Z"),
      [agendamentoExistente, outroAgendamento],
      1 // ignorando o id: 1, mas colidindo com o id: 99
    );

    expect(resultado.temConflito).toBe(true);
    expect(resultado.conflitoCom?.id).toBe(99);
  });
});
